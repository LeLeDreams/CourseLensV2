"use client";

import CourseSummaryCard, { type CourseListItem } from "@/components/CourseSummaryCard";
import RequestCourseModal from "@/components/RequestCourseModal";
import { Slider } from "@/components/Slider";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CaretDown, X } from "@phosphor-icons/react";

const MAX_COMPARE = 4;

type SortBy = "" | "code" | "name" | "rating" | "difficulty" | "gpa" | "credits";
type SortDirection = "asc" | "desc";

type Course = CourseListItem & {
  id: number;
  code: string;
  name: string;
  professor: string;
  rating: number;
  difficulty: number;
  reviews: number;
  department: string;
  college: string | null;
  avg_gpa: number;
  credits?: number | null;
  max_credits?: number | null;
};

// Raw SPIRE college names → display labels
const COLLEGE_DISPLAY: Record<string, string> = {
  "College of Education": "Education",
  "College of Engineering": "Engineering",
  "College of Humanities & Fine Arts": "Humanities & Fine Arts",
  "College of Natural Sciences": "Natural Sciences",
  "College of Social & Behavioral Sciences": "Social & Behavioral Sciences",
  "Isenberg School of Management": "Management",
  "Manning College of Information & Computer Sciences": "Information & Computer Sciences",
  "School of Nursing": "Nursing",
  "School of Public Health & Health Sciences": "Public Health & Health Sciences",
  "Other Credit Offerings": "Other",
  "Non-Credit Offerings (thru CE)": "Other",
  "Equivalency (Pseudo) Courses": "Other",
};

// Reverse: display labels → raw Supabase values (for passing to API)
const COLLEGE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(COLLEGE_DISPLAY).map(([raw, label]) => [label, raw])
);

function collegeLabel(raw: string): string {
  return COLLEGE_DISPLAY[raw] ?? raw;
}

function sortByLabel(field: SortBy): string {
  if (field === "code") return "Code";
  if (field === "name") return "Name";
  if (field === "rating") return "Rating";
  if (field === "difficulty") return "Difficulty";
  if (field === "gpa") return "Avg Grade";
  if (field === "credits") return "Credits";
  return "Sort by...";
}

// 2026-05-06: unused — level bucketing now lives in the course_metrics view
// (see add_level_and_effective_credits.sql). Kept commented for reference.
/*
function getCourseLevel(code: string): number | null {
  const match = code.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0]);
  if (num < 100) return null;
  if (num < 200) return 100;
  if (num < 300) return 200;
  if (num < 400) return 300;
  if (num < 500) return 400;
  if (num < 600) return 500;
  return 600;
}
*/

export default function CoursesPage() {
  // useSearchParams requires a Suspense boundary for static prerendering
  // (Next 16 App Router). Inner component holds all the existing logic.
  return (
    <Suspense fallback={<div className="min-h-full flex-1 bg-background" />}>
      <CoursesPageInner />
    </Suspense>
  );
}

function CoursesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-synced state: read initial values from query params
  const [inputQ, setInputQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [creditsRange, setCreditsRange] = useState<[number, number]>([1, 6]);
  const [courseLevelRange, setCourseLevelRange] = useState<[number, number]>([100, 600]);
  const [page, setPage] = useState(0);

  const [visibleCourses, setVisibleCourses] = useState<Course[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<number>>(new Set());
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [collegeOptions, setCollegeOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize state from URL on mount
  useEffect(() => {
    setInputQ(searchParams.get("q") || "");
    setDebouncedQ(searchParams.get("q") || "");
    const collegeLabel = searchParams.get("college") || "";
    setCollege(collegeLabel);
    setDepartment(searchParams.get("department") || "");
    setSortBy((searchParams.get("sort") || "") as SortBy);
    setSortDirection((searchParams.get("direction") || "asc") as SortDirection);
    setPage(parseInt(searchParams.get("page") || "0", 10));
    const minLevel = parseInt(searchParams.get("minLevel") || "100", 10);
    const maxLevel = parseInt(searchParams.get("maxLevel") || "600", 10);
    setCourseLevelRange([minLevel, maxLevel]);
    const minCredits = parseInt(searchParams.get("minCredits") || "1", 10);
    const maxCredits = parseInt(searchParams.get("maxCredits") || "6", 10);
    setCreditsRange([minCredits, maxCredits]);
  }, [searchParams]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(inputQ);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputQ]);

  // Update URL when filter/sort state changes
  const updateURL = (params: Record<string, string | number>) => {
    const current = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([k, v]) => {
      if (v === "" || v === 0) {
        current.delete(k);
      } else {
        current.set(k, String(v));
      }
    });
    router.replace(`/courses?${current.toString()}`);
  };

  // Fetch courses from API
  const fetchCourses = async (
    q: string,
    col: string,
    dept: string,
    minLevel: number,
    maxLevel: number,
    minCredits: number,
    maxCredits: number,
    s: SortBy,
    dir: SortDirection,
    p: number,
    signal: AbortSignal
  ) => {
    setLoading(true);
    if (p === 0) setVisibleCourses([]);
    try {
      const params = new URLSearchParams({
        q,
        college: col,
        department: dept,
        minLevel: String(minLevel),
        maxLevel: String(maxLevel),
        minCredits: String(minCredits),
        // Slider max (6) means "6+" in the UI — send a high cap so courses
        // with 7+ credits aren't silently excluded.
        maxCredits: String(maxCredits >= 6 ? 9999 : maxCredits),
        sort: s,
        direction: dir,
        page: String(p),
        pageSize: "30",
      });

      const res = await fetch(`/api/courses?${params}`, { signal });
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const json = await res.json();
      const rows: Course[] = json.data || [];
      setVisibleCourses((prev) => (p === 0 ? rows : [...prev, ...rows]));
      setTotalCount(json.total || 0);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch on debounced search or page change
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Convert college display label back to raw Supabase value
    const collegeRaw = college ? COLLEGE_REVERSE[college] || college : "";

    fetchCourses(
      debouncedQ,
      collegeRaw,
      department,
      courseLevelRange[0],
      courseLevelRange[1],
      creditsRange[0],
      creditsRange[1],
      sortBy,
      sortDirection,
      page,
      controller.signal
    );

    return () => controller.abort();
  }, [debouncedQ, college, department, courseLevelRange, creditsRange, sortBy, sortDirection, page]);

  // Fetch facet options (colleges, departments) — departments scoped by college
  useEffect(() => {
    const collegeRaw = college ? COLLEGE_REVERSE[college] || college : "";
    const params = new URLSearchParams();
    if (collegeRaw) params.set("college", collegeRaw);
    fetch(`/api/courses/facets?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.colleges)) {
          const labels = Array.from(
            new Set((json.colleges as string[]).map(collegeLabel))
          ).sort();
          setCollegeOptions(labels);
        }
        if (Array.isArray(json.departments)) {
          setDepartmentOptions(json.departments as string[]);
        }
      })
      .catch((err) => console.error("Facets fetch error:", err));
  }, [college]);

  function handleCollegeChange(next: string) {
    setCollege(next);
    setDepartment("");
    setPage(0);
    updateURL({
      college: next,
      department: "",
      page: 0,
      q: debouncedQ,
      sort: sortBy,
      direction: sortDirection,
      minLevel: courseLevelRange[0],
      maxLevel: courseLevelRange[1],
      minCredits: creditsRange[0],
      maxCredits: creditsRange[1],
    });
  }

  function handleDepartmentChange(next: string) {
    setDepartment(next);
    setPage(0);
    updateURL({
      department: next,
      page: 0,
      college,
      q: debouncedQ,
      sort: sortBy,
      direction: sortDirection,
      minLevel: courseLevelRange[0],
      maxLevel: courseLevelRange[1],
      minCredits: creditsRange[0],
      maxCredits: creditsRange[1],
    });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputQ(e.target.value);
    setPage(0);
    updateURL({
      q: e.target.value,
      page: 0,
      college,
      department,
      sort: sortBy,
      direction: sortDirection,
      minLevel: courseLevelRange[0],
      maxLevel: courseLevelRange[1],
      minCredits: creditsRange[0],
      maxCredits: creditsRange[1],
    });
  }

  function handleSortChange(next: SortBy) {
    setSortBy(next);
    setPage(0);
    updateURL({
      sort: next,
      page: 0,
      q: debouncedQ,
      college,
      department,
      direction: sortDirection,
      minLevel: courseLevelRange[0],
      maxLevel: courseLevelRange[1],
      minCredits: creditsRange[0],
      maxCredits: creditsRange[1],
    });
  }

  function handleSortDirectionChange(next: SortDirection) {
    setSortDirection(next);
    setPage(0);
    updateURL({
      direction: next,
      page: 0,
      q: debouncedQ,
      college,
      department,
      sort: sortBy,
      minLevel: courseLevelRange[0],
      maxLevel: courseLevelRange[1],
      minCredits: creditsRange[0],
      maxCredits: creditsRange[1],
    });
  }

  function handleCreditsChange(v: [number, number]) {
    setCreditsRange(v);
    setPage(0);
    updateURL({
      minCredits: v[0],
      maxCredits: v[1],
      page: 0,
      q: debouncedQ,
      college,
      department,
      sort: sortBy,
      direction: sortDirection,
      minLevel: courseLevelRange[0],
      maxLevel: courseLevelRange[1],
    });
  }

  function handleLevelChange(v: [number, number]) {
    setCourseLevelRange(v);
    setPage(0);
    updateURL({
      minLevel: v[0],
      maxLevel: v[1],
      page: 0,
      q: debouncedQ,
      college,
      department,
      sort: sortBy,
      direction: sortDirection,
      minCredits: creditsRange[0],
      maxCredits: creditsRange[1],
    });
  }

  function toggleCompare(courseId: number) {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
        return next;
      }
      if (next.size >= MAX_COMPARE) {
        const oldest = next.values().next().value as number | undefined;
        if (oldest !== undefined) next.delete(oldest);
      }
      next.add(courseId);
      return next;
    });
  }

  function clearComparison() {
    setSelectedForCompare(new Set());
  }

  const selectedCoursesOrdered = Array.from(selectedForCompare)
    .map((id) => visibleCourses.find((c) => c.id === id))
    .filter((c): c is Course => c != null);

  const canLoadMore = visibleCourses.length < totalCount;

  return (
    <div className="min-h-full flex-1 bg-background pb-32">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Browse Courses</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="shrink-0 rounded-lg border border-[#91AC8F] bg-white px-4 py-2 text-sm font-medium text-[#4B5945] shadow-sm hover:bg-[#B2C9AD]/20"
            >
              Request a class
            </button>
          </div>
        </div>

        <RequestCourseModal open={requestModalOpen} onClose={() => setRequestModalOpen(false)} />

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, code, or professor..."
            value={inputQ}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#91AC8F]"
          />
          <select
            value={college}
            onChange={(e) => handleCollegeChange(e.target.value)}
            className="border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
          >
            <option value="">Select College</option>
            {collegeOptions.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
          >
            <option value="">Select Department</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full rounded-xl bg-[#4B5945] p-4 shadow-sm lg:sticky lg:top-4 lg:h-fit lg:w-72">
            <h3 className="mb-4 text-lg font-semibold text-white">Filters</h3>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-[#B2C9AD]">College</label>
              <Listbox value={college} onChange={handleCollegeChange}>
                <ListboxButton className="flex w-full items-center justify-between rounded-lg border border-[#66785F] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#66785F] data-open:bg-[#66785F]">
                  {college || "All Colleges"}
                  <CaretDown size={14} weight="bold" />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className="z-10 origin-top rounded-lg border border-gray-200 bg-white p-1 shadow-lg transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                >
                  <ListboxOption
                    value=""
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    All Colleges
                  </ListboxOption>
                  {collegeOptions.map((col) => (
                    <ListboxOption
                      key={col}
                      value={col}
                      className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                    >
                      {col}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Listbox>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-[#B2C9AD]">Department</label>
              <Listbox value={department} onChange={handleDepartmentChange}>
                <ListboxButton className="flex w-full items-center justify-between rounded-lg border border-[#66785F] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#66785F] data-open:bg-[#66785F]">
                  {department || "All Departments"}
                  <CaretDown size={14} weight="bold" />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className="z-10 origin-top rounded-lg border border-gray-200 bg-white p-1 shadow-lg transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                >
                  <ListboxOption
                    value=""
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    All Departments
                  </ListboxOption>
                  {departmentOptions.map((dept) => (
                    <ListboxOption
                      key={dept}
                      value={dept}
                      className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                    >
                      {dept}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Listbox>
            </div>

            <div className="mb-4 space-y-3 border-t border-[#91AC8F] pt-4">
              <Listbox value={sortBy} onChange={handleSortChange}>
                <ListboxButton className="flex w-full items-center justify-between rounded-lg border border-[#66785F] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#66785F] data-open:bg-[#66785F]">
                  {sortByLabel(sortBy)}
                  <CaretDown size={14} weight="bold" />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className="z-10 origin-top rounded-lg border border-gray-200 bg-white p-1 shadow-lg transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                >
                  <ListboxOption
                    value=""
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    None
                  </ListboxOption>
                  <ListboxOption
                    value="code"
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    Code
                  </ListboxOption>
                  <ListboxOption
                    value="name"
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    Name
                  </ListboxOption>
                  <ListboxOption
                    value="rating"
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    Rating
                  </ListboxOption>
                  <ListboxOption
                    value="difficulty"
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    Difficulty
                  </ListboxOption>
                  <ListboxOption
                    value="gpa"
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    Avg Grade
                  </ListboxOption>
                  <ListboxOption
                    value="credits"
                    className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                  >
                    Credits
                  </ListboxOption>
                </ListboxOptions>
              </Listbox>

              {sortBy && (
                <Listbox value={sortDirection} onChange={handleSortDirectionChange}>
                  <ListboxButton className="flex w-full items-center justify-between rounded-lg border border-[#66785F] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#66785F] data-open:bg-[#66785F]">
                    <span className="flex items-center gap-1.5">
                      {sortDirection === "asc" ? <ArrowUp size={13} weight="bold" /> : <ArrowDown size={13} weight="bold" />}
                      {sortDirection === "asc" ? "Ascending" : "Descending"}
                    </span>
                    <CaretDown size={14} weight="bold" />
                  </ListboxButton>
                  <ListboxOptions
                    anchor="bottom"
                    transition
                    className="z-10 origin-top rounded-lg border border-gray-200 bg-white p-1 shadow-lg transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                  >
                    <ListboxOption
                      value="asc"
                      className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                    >
                      <span className="flex items-center gap-1.5"><ArrowUp size={13} weight="bold" /> Ascending</span>
                    </ListboxOption>
                    <ListboxOption
                      value="desc"
                      className="cursor-pointer rounded px-3 py-2 text-sm text-gray-900 transition-colors data-focus:bg-[#B2C9AD]/40"
                    >
                      <span className="flex items-center gap-1.5"><ArrowDown size={13} weight="bold" /> Descending</span>
                    </ListboxOption>
                  </ListboxOptions>
                </Listbox>
              )}
            </div>

            <div className="relative mb-4 border-t border-[#91AC8F] pt-4">
              <Listbox value="" onChange={() => {}}>
                <ListboxButton className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-white transition-colors hover:bg-[#66785F] data-open:bg-[#66785F]">
                  <span className="text-sm font-semibold">
                    Credits: {creditsRange[0]}-{creditsRange[1] === 6 ? "6+" : creditsRange[1]}
                  </span>
                  <CaretDown size={14} weight="bold" />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className="z-10 origin-top rounded-lg border border-gray-200 bg-white p-4 shadow-lg transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                >
                  <div className="pointer-events-auto w-48">
                    <div className="mb-3 text-center text-sm font-medium text-gray-600">
                      {creditsRange[0]} - {creditsRange[1] === 6 ? "6+" : creditsRange[1]}
                    </div>
                    <Slider
                      value={creditsRange}
                      onValueChange={handleCreditsChange}
                      min={1}
                      max={6}
                      step={1}
                      minStepsBetweenThumbs={0}
                    />
                  </div>
                </ListboxOptions>
              </Listbox>
            </div>

            <div className="relative border-t border-[#91AC8F] pt-4">
              <Listbox value="" onChange={() => {}}>
                <ListboxButton className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-white transition-colors hover:bg-[#66785F] data-open:bg-[#66785F]">
                  <span className="text-sm font-semibold">
                    Level: {courseLevelRange[0]}-{courseLevelRange[1] === 600 ? "600+" : courseLevelRange[1]}
                  </span>
                  <CaretDown size={14} weight="bold" />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className="z-10 origin-top rounded-lg border border-gray-200 bg-white p-4 shadow-lg transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
                >
                  <div className="pointer-events-auto w-48">
                    <div className="mb-3 text-center text-sm font-medium text-gray-600">
                      {courseLevelRange[0]} - {courseLevelRange[1] === 600 ? "600+" : courseLevelRange[1]}
                    </div>
                    <Slider
                      value={courseLevelRange}
                      onValueChange={handleLevelChange}
                      min={100}
                      max={600}
                      step={100}
                      minStepsBetweenThumbs={0}
                    />
                  </div>
                </ListboxOptions>
              </Listbox>
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <p className="mb-4 text-sm text-gray-400">
              {loading && visibleCourses.length === 0
                ? "Loading..."
                : visibleCourses.length < totalCount
                  ? `Showing ${visibleCourses.length} of ${totalCount} courses`
                  : `${totalCount} course${totalCount !== 1 ? "s" : ""} found`}
            </p>

            <div className="flex flex-col gap-4">
              {loading && visibleCourses.length === 0 ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white"
                    />
                  ))}
                </>
              ) : visibleCourses.length === 0 ? (
                <p className="py-16 text-center text-gray-400">No courses match your search.</p>
              ) : (
                <>
                  {visibleCourses.map((course) => (
                    <CourseSummaryCard
                      key={course.id}
                      course={course}
                      selectable
                      selected={selectedForCompare.has(course.id)}
                      onToggleSelect={toggleCompare}
                    />
                  ))}
                  {canLoadMore && (
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loading}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading ? "Loading..." : "Load more"}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <aside
        className={`fixed bottom-5 left-1/2 z-20 flex w-[min(930px,calc(100%-26px))] -translate-x-1/2 items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 sm:px-4 ${
          selectedForCompare.size > 0
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[130%] opacity-0"
        }`}
        aria-live="polite"
        aria-label="Course comparison selection"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="shrink-0 text-sm font-extrabold text-emerald-950">
            {selectedForCompare.size} of {MAX_COMPARE} selected
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCoursesOrdered.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#B2C9AD] px-2.5 py-0.5 text-xs font-bold text-[#4B5945]"
              >
                {c.code}
                <button
                  type="button"
                  onClick={() => toggleCompare(c.id)}
                  className="leading-none text-[#4B5945] hover:text-[#66785F]"
                  aria-label={`Remove ${c.code} from comparison`}
                >
                  <X size={14} weight="bold" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={clearComparison}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={selectedForCompare.size < 2}
            onClick={() => {
              if (selectedForCompare.size < 2) return;
              router.push(`/courses/compare?ids=${Array.from(selectedForCompare).join(",")}`);
            }}
            className="rounded-xl bg-[#4B5945] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#66785F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Compare selected
          </button>
        </div>
      </aside>
    </div>
  );
}
