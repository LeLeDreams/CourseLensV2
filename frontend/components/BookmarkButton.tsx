"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark } from "@phosphor-icons/react";
import { useBookmarks } from "./BookmarkProvider";
import { useToast } from "@/components/ToastProvider";

type BookmarkButtonProps = {
  courseId: number;
  className?: string;
};

export default function BookmarkButton({ courseId, className = "" }: BookmarkButtonProps) {
  const pathname = usePathname();
  const { user, loading, isBookmarked, toggleBookmark } = useBookmarks();
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();

  const saved = isBookmarked(courseId);
  const redirect = encodeURIComponent(pathname || "/courses");

  if (!loading && !user) {
    return (
      <Link
        href={`/login?redirect=${redirect}`}
        className={`inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-400 shadow-sm transition-colors hover:border-[#91AC8F] hover:text-[#4B5945] dark:border-[#374033] dark:bg-[#232A1F] dark:text-[#4B5945] dark:hover:border-[#91AC8F] dark:hover:text-[#91AC8F] ${className}`}
        title="Sign in to save"
        aria-label="Sign in to save"
      >
        <Bookmark size={18} weight="regular" />
      </Link>
    );
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending || loading) return;
    setPending(true);
    try {
      await toggleBookmark(courseId);
      showToast(saved ? "Removed from saved." : "Course saved.", "success");
    } catch {
      showToast("Bookmark update failed.", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || loading}
      className={`inline-flex items-center justify-center rounded-lg border p-2 shadow-sm transition-all disabled:opacity-50 ${
        saved
          ? "border-amber-400 bg-amber-400 text-white hover:bg-amber-500 hover:border-amber-500 dark:border-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600"
          : "border-gray-200 bg-white text-gray-400 hover:border-[#91AC8F] hover:text-[#4B5945] dark:border-[#374033] dark:bg-[#232A1F] dark:text-[#4B5945] dark:hover:border-[#91AC8F] dark:hover:text-[#91AC8F]"
      } ${className}`}
      title={saved ? "Remove from saved" : "Save course"}
      aria-label={saved ? "Remove from saved" : "Save course"}
      aria-pressed={saved}
    >
      <Bookmark size={18} weight={saved ? "fill" : "regular"} />
    </button>
  );
}
