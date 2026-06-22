import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(url, anonKey);

// Mirror of SUBJECT_SHORTHANDS from pages/courses/page.tsx — allows expandSearch to work server-side
const SUBJECT_SHORTHANDS: [abbr: string, full: string][] = [
  ["cs", "compsci"],
  ["ece", "e&c-eng"],
  ["bme", "bmed-eng"],
  ["stats", "statistc"],
  ["stat", "statistc"],
  ["mie", "m&i-eng"],
];

// Expand user shortcuts (e.g. "cs230" → ["cs230", "compsci 230"]) for broader search
function expandSearch(raw: string): string[] {
  const q = raw.trim().toLowerCase();
  const terms: string[] = [q];
  for (const [abbr, full] of SUBJECT_SHORTHANDS) {
    if (q.startsWith(abbr)) {
      const rest = q.slice(abbr.length);
      const expanded = full + (/^\d/.test(rest) ? " " : "") + rest;
      terms.push(expanded);
      break;
    }
  }
  return terms;
}

// PostgREST .or() splits on commas/parens and treats them as syntax. Strip
// them from user input rather than trying to escape — they're not useful
// inside an ILIKE search of course codes/names/professors.
function sanitizeForOr(t: string): string {
  return t.replace(/[,()*]/g, " ").trim();
}

// Convert search terms into a Supabase .or() filter string
function buildSearchFilter(q: string): string {
  if (!q.trim()) return "";
  const terms = expandSearch(q)
    .map(sanitizeForOr)
    .filter(Boolean);
  if (terms.length === 0) return "";
  const conditions = terms
    .map((t) => `code.ilike.%${t}%,name.ilike.%${t}%,professor.ilike.%${t}%`)
    .join(",");
  return conditions;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const college = searchParams.get("college") || null;
    const department = searchParams.get("department") || null;
    const minLevel = parseInt(searchParams.get("minLevel") || "0", 10);
    const maxLevel = parseInt(searchParams.get("maxLevel") || "9999", 10);
    const minCredits = parseInt(searchParams.get("minCredits") || "0", 10);
    const maxCredits = parseInt(searchParams.get("maxCredits") || "9999", 10);
    const sort = searchParams.get("sort") || "";
    const direction = searchParams.get("direction") || "asc";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "30", 10);

    // Build query with text search, exact filters, and sorting
    let query = supabase.from("course_metrics").select("*", { count: "exact" });

    if (q.trim()) {
      const searchFilter = buildSearchFilter(q);
      query = query.or(searchFilter);
    }

    if (college) {
      query = query.eq("college", college);
    }

    if (department) {
      query = query.eq("department", department);
    }

    // Level filter (DB-side; see add_level_and_effective_credits.sql).
    // `level` is NULL for codes with no digits → always pass. `level = -1`
    // marks num<100 → always exclude.
    // Skip when the slider covers the full bucket range (100..600) — the
    // .or() over a computed view column is expensive and would just be a
    // near-no-op on the default UI state.
    if (minLevel > 100 || maxLevel < 600) {
      query = query.or(
        `level.is.null,and(level.gte.${minLevel},level.lte.${maxLevel})`
      );
    }

    // Credits filter (DB-side). Unknown effective_credits stays visible by
    // default (regression fix). Slider domain is 1..6, so anything covering
    // that range means "no filter" and we can skip the .or().
    if (minCredits > 1 || maxCredits < 6) {
      query = query.or(
        `effective_credits.is.null,and(effective_credits.gte.${minCredits},effective_credits.lte.${maxCredits})`
      );
    }

    // Server-side sort. Map UI field → DB column.
    //   gpa     → avg_gpa
    //   code    → code_sort (numeric-aware key, e.g. "COMPSCI 000100")
    //   credits → effective_credits (`credits` is NULL for many rows that only
    //             populate max_credits; sort on the COALESCE column instead)
    // nullsFirst:false keeps unrated/unknown rows at the end consistently
    // across pages (relies on view exposing nulls — see SQL script).
    if (sort && sort !== "") {
      let sortField = sort;
      if (sort === "gpa") sortField = "avg_gpa";
      else if (sort === "code") sortField = "code_sort";
      else if (sort === "credits") sortField = "effective_credits";
      query = query.order(sortField, {
        ascending: direction === "asc",
        nullsFirst: false, // TODO: Use nullsFirst = True to track down the nulls in database and fix them by scraping/populating their values
      });
    }

    // Fetch one page worth of rows
    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filtering moved DB-side via `level` / `effective_credits` columns
    // (see add_level_and_effective_credits.sql). Post-page JS filtering caused
    // sparse pages and incorrect `total`, and defaulted unknown credits to 0
    // which dropped them. Old block kept commented for reference.
    // 2026-05-06: superseded by DB-side .or() filters above.
    /*
    let filtered = (data || []).filter((course: any) => {
      const digits = String(course.code || "").match(/\d+/);
      const num = digits ? parseInt(digits[0], 10) : NaN;
      if (Number.isFinite(num)) {
        let level: number;
        if (num < 100) return false;
        else if (num < 200) level = 100;
        else if (num < 300) level = 200;
        else if (num < 400) level = 300;
        else if (num < 500) level = 400;
        else if (num < 600) level = 500;
        else level = 600;
        if (level < minLevel || level > maxLevel) return false;
      }

      const credits = course.credits ?? course.max_credits ?? 0;
      if (credits < minCredits || credits > maxCredits) return false;

      return true;
    });
    */
    let filtered = data || [];

    // 2026-05-06: superseded by DB-side .order(..., { nullsFirst: false })
    // above. The in-memory sort only re-ordered within a single page, so
    // unrated rows on page N could appear before rated rows on page N+1.
    /*
    if (sort && sort !== "") {
      const sortField = sort === "gpa" ? "avg_gpa" : sort;
      const isNumeric = ["rating", "difficulty", "avg_gpa"].includes(sortField);
      if (isNumeric) {
        filtered.sort((a: any, b: any) => {
          const aVal = a[sortField] || 0;
          const bVal = b[sortField] || 0;
          const aZero = aVal === 0;
          const bZero = bVal === 0;
          if (aZero && !bZero) return 1;
          if (!aZero && bZero) return -1;
          return direction === "asc" ? aVal - bVal : bVal - aVal;
        });
      }
    }
    */

    return NextResponse.json({
      data: filtered,
      total: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
