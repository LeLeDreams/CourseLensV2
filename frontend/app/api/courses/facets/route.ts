import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(url, anonKey);

// Returns { colleges, departments }. If ?college=<raw> is provided,
// departments is scoped to that college.
export async function GET(req: NextRequest) {
  try {
    const college = req.nextUrl.searchParams.get("college") || null;

    let collegesQuery = supabase
      .from("course_metrics")
      .select("college")
      .not("college", "is", null)
      .limit(10000);

    let deptQuery = supabase
      .from("course_metrics")
      .select("department")
      .not("department", "is", null)
      .limit(10000);

    if (college) deptQuery = deptQuery.eq("college", college);

    const [collegesRes, deptRes] = await Promise.all([collegesQuery, deptQuery]);

    if (collegesRes.error) {
      return NextResponse.json({ error: collegesRes.error.message }, { status: 500 });
    }
    if (deptRes.error) {
      return NextResponse.json({ error: deptRes.error.message }, { status: 500 });
    }

    const colleges = Array.from(
      new Set((collegesRes.data || []).map((r: any) => r.college).filter(Boolean))
    ).sort();
    const departments = Array.from(
      new Set((deptRes.data || []).map((r: any) => r.department).filter(Boolean))
    ).sort();

    return NextResponse.json({ colleges, departments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
