"use client";

import Link from "next/link";
import BookmarkButton from "./BookmarkButton";

import { cachedFetch, COURSE_TTL, REVIEWS_TTL } from "@/lib/course-cache";
import { formatCredits } from "@/lib/courseFormat";
import { supabase } from "@/lib/supabase/client";


export type CourseListItem = {
  id: number;
  code: string;
  name: string;
  professor: string;
  rating: number;
  difficulty: number;
  reviews: number;
  department: string;
  credits?: number | null;
  max_credits?: number | null;
};

type CourseSummaryCardProps = {
  course: CourseListItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (courseId: number) => void;
};

export default function CourseSummaryCard({
  course,
  selectable = false,
  selected = false,
  onToggleSelect,
}: CourseSummaryCardProps) {
  function prefetchCourse() {
    const id = course.id;

    cachedFetch(`course:${id}`, COURSE_TTL, async () => {
      const { data, error } = await supabase
        .from("course_metrics")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    });

    cachedFetch(`reviews:${id}:page:1`, REVIEWS_TTL, async () => {
      const { data } = await supabase
        .from("course_evaluations")
        .select("id, course_id, student_profile_id, rating, difficulty, grade, semester, professor_name, hours_per_week, comment, created_at")
        .eq("course_id", id)
        .order("created_at", { ascending: false });

      return data || [];
    });
  }
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {selectable && (
        <label
          className="absolute left-3 top-3 z-10 inline-flex cursor-pointer items-center"
          aria-label={`Select ${course.code} for comparison`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect?.(course.id)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
      )}
      <Link
        href={`/courses/${course.id}`}
        onMouseEnter={prefetchCourse}
        onFocus={prefetchCourse}
        className={`block p-5 pr-14 ${selectable ? "pl-24" : ""}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
              {course.code}
            </span>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">{course.name}</h3>
            <p className="text-sm text-gray-500">{course.professor}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{(course.rating ?? 0.0).toFixed(1)}</div>
            <div className="text-xs text-gray-400">/ 5.0</div>
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm text-gray-500">
          <span>
            Difficulty: <strong>{(course.difficulty?? 0.0).toFixed(1)}/5</strong>
          </span>
          <span>{course.reviews} reviews</span>
          <span>{course.department}</span>
          <span>Credits: <strong>{formatCredits(course.credits, course.max_credits)}</strong></span>
        </div>
      </Link>
      <BookmarkButton courseId={course.id} className="absolute right-3 top-3" />
    </div>
  );
}
