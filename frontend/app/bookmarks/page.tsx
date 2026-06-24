"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import CourseSummaryCard, { type CourseListItem } from "@/components/CourseSummaryCard";
import { useBookmarks } from "@/components/BookmarkProvider";

export default function BookmarksPage() {
  const { user, bookmarkedIds, loading: bookmarksLoading } = useBookmarks();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (bookmarksLoading) return;
      if (!user) {
        setCourses([]);
        setLoading(false);
        return;
      }
      const ids = Array.from(bookmarkedIds);
      if (ids.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("course_metrics").select("*").in("id", ids);
      if (!error && data) {
        setCourses(data as CourseListItem[]);
      } else {
        setCourses([]);
      }
      setLoading(false);
    }
    void load();
  }, [user, bookmarkedIds, bookmarksLoading]);

  if (!bookmarksLoading && !user) {
    return (
      <div className="min-h-full flex-1 bg-background">
        <main className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-gray-700 dark:text-[#B2C9AD]">Sign in to see saved courses.</p>
          <Link
            href="/login?redirect=/bookmarks"
            className="mt-4 inline-block rounded-lg bg-[#4B5945] px-4 py-2 text-sm font-medium text-white hover:bg-[#66785F] transition-colors"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full flex-1 bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-[#E8EFE6]">Saved courses</h2>
        {loading || bookmarksLoading ? (
          <p className="text-gray-400 dark:text-[#66785F]">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-500 dark:text-[#91AC8F]">
            No saved courses yet. Use the bookmark on a course card or course page.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {courses.map((c) => (
              <CourseSummaryCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
