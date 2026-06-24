"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { PencilSimple, Bookmark, ArrowRight } from "@phosphor-icons/react";
import { useToast } from "@/components/ToastProvider";

type Review = {
  id: number;
  course_id: number;
  rating: number;
  difficulty: number;
  grade: string | null;
  semester: string | null;
  professor_name: string | null;
  hours_per_week: number | null;
  comment: string | null;
  created_at: string;
  course_metrics: { code: string; name: string } | null;
};

type CourseRequest = {
  id: number;
  subject: string;
  course_number: string;
  class_name: string;
  status: string;
  denial_reason: string | null;
  created_at: string;
};

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-sm dark:border-[#374033] dark:bg-[#232A1F]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Link
            href={`/courses/${review.course_id}`}
            className="text-sm font-bold text-[#4B5945] hover:text-[#66785F] hover:underline dark:text-[#91AC8F] dark:hover:text-[#B2C9AD]"
          >
            {review.course_metrics?.code ?? "Course"}
          </Link>
          {review.course_metrics?.name && (
            <p className="text-xs text-gray-500 mt-0.5 dark:text-[#66785F]">
              {review.course_metrics.name}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {review.semester && (
            <span className="text-xs text-gray-400 dark:text-[#66785F]">{review.semester}</span>
          )}
          {review.professor_name && (
            <span className="text-xs text-gray-400 dark:text-[#66785F]">{review.professor_name}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
        <span className="rounded bg-[#B2C9AD]/30 px-2 py-0.5 text-[#4B5945] dark:bg-[#4B5945]/30 dark:text-[#B2C9AD]">
          ★ {review.rating.toFixed(1)} / 5
        </span>
        <span className="rounded bg-orange-50 px-2 py-0.5 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          Diff: {review.difficulty.toFixed(1)} / 5
        </span>
        {review.grade && (
          <span className="rounded bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Grade: {review.grade}
          </span>
        )}
        {review.hours_per_week && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-[#374033] dark:text-[#91AC8F]">
            {review.hours_per_week} hrs/wk
          </span>
        )}
      </div>

      {review.comment && (
        <p className="border-l-2 border-[#B2C9AD] pl-3 text-sm italic text-gray-600 dark:border-[#374033] dark:text-[#B2C9AD]">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}

      <Link
        href={`/courses/${review.course_id}/evaluate`}
        className="mt-3 inline-flex items-center gap-1 text-xs text-[#66785F] hover:text-[#4B5945] hover:underline dark:text-[#91AC8F] dark:hover:text-[#B2C9AD]"
      >
        Edit review <ArrowRight size={11} weight="bold" />
      </Link>
    </div>
  );
}

export default function Profile() {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseRequests, setCourseRequests] = useState<CourseRequest[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("student_profiles")
      .select("id, student_name")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setStudentId(data.id);
          setName(data.student_name || "");
        }
      });
  }, [userId]);

  useEffect(() => {
    if (!studentId) return;
    supabase
      .from("course_evaluations")
      .select("id, course_id, rating, difficulty, grade, semester, professor_name, hours_per_week, comment, created_at, course_metrics(code, name)")
      .eq("student_profile_id", studentId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data as Review[]);
        setLoading(false);
      });
  }, [studentId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("class_add_requests")
      .select("id, subject, course_number, class_name, status, denial_reason, created_at")
      .eq("requested_by_user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setCourseRequests(data); });
  }, [userId]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return "—";
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const avgDifficulty = useMemo(() => {
    if (!reviews.length) return "—";
    return (reviews.reduce((s, r) => s + r.difficulty, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (email?.[0]?.toUpperCase() ?? "?");

  const startEdit = () => { setDraftName(name); setEditingName(true); };
  const cancelEdit = () => setEditingName(false);
  const commitName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) { cancelEdit(); return; }
    if (!userId) { showToast("Not signed in.", "error"); return; }
    const prev = name;
    setName(trimmed);
    setEditingName(false);
    const { error } = await supabase
      .from("student_profiles")
      .upsert({ user_id: userId, student_name: trimmed, email: email ?? "" }, { onConflict: "user_id" });
    if (error) {
      showToast("Failed to save name: " + error.message, "error");
      setName(prev);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;
    const res = await fetch("/api/ai-overview/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, studentId }),
    });
    const data = await res.json();
    if (data.error) {
      alert("Error: " + data.error);
    } else {
      await supabase.auth.signOut();
      window.location.replace("/");
    }
  };

  return (
    <div className="min-h-0 flex-1 bg-background py-10">
      <div className="mx-auto max-w-2xl space-y-5 px-4">

        {/* ── Profile card ── */}
        <div className="rounded-2xl border border-[#B2C9AD] bg-white p-6 shadow-sm dark:border-[#374033] dark:bg-[#232A1F]">

          {/* Avatar + name/email */}
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#4B5945] text-xl font-bold text-white select-none dark:bg-[#66785F]">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") cancelEdit(); }}
                    className="min-w-0 flex-1 rounded-lg border border-[#91AC8F] bg-transparent px-2 py-1 text-lg font-bold text-[#4B5945] focus:outline-none dark:text-[#B2C9AD]"
                  />
                  <button
                    onClick={commitName}
                    className="shrink-0 rounded-md bg-[#4B5945] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#66785F] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:text-[#66785F] dark:hover:text-[#91AC8F]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEdit}
                  className="group flex items-center gap-2 text-left"
                  aria-label="Edit name"
                >
                  <h1 className="truncate text-xl font-bold text-[#4B5945] transition-colors group-hover:text-[#66785F] dark:text-[#B2C9AD] dark:group-hover:text-[#E8EFE6]">
                    {name || "Add your name"}
                  </h1>
                  <PencilSimple
                    size={15}
                    weight="duotone"
                    className="shrink-0 text-[#91AC8F] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              )}
              <p className="truncate text-sm text-gray-500 dark:text-[#91AC8F]">{email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-[#E8EFE6] border-t border-[#E8EFE6] pt-5 dark:divide-[#374033] dark:border-[#374033]">
            <div className="pr-4 text-center">
              <p className="text-2xl font-bold text-[#4B5945] dark:text-[#91AC8F]">{reviews.length}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-[#66785F]">Reviews written</p>
            </div>
            <div className="px-4 text-center">
              <p className="text-2xl font-bold text-[#4B5945] dark:text-[#91AC8F]">{avgRating}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-[#66785F]">Avg. rating given</p>
            </div>
            <div className="pl-4 text-center">
              <p className="text-2xl font-bold text-[#4B5945] dark:text-[#91AC8F]">{avgDifficulty}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-[#66785F]">Avg. difficulty given</p>
            </div>
          </div>
        </div>

        {/* ── Quick links ── */}
        <div className="flex gap-3">
          <Link
            href="/bookmarks"
            className="inline-flex items-center gap-2 rounded-xl border border-[#B2C9AD] bg-white px-4 py-2.5 text-sm font-medium text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/20 dark:border-[#374033] dark:bg-[#232A1F] dark:text-[#B2C9AD] dark:hover:bg-[#374033]"
          >
            <Bookmark size={16} weight="duotone" />
            Saved courses
          </Link>
        </div>

        {/* ── Reviews ── */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-[#4B5945] dark:text-[#B2C9AD]">
            Reviews
            {reviews.length > 0 && (
              <span className="ml-2 rounded-full bg-[#B2C9AD]/50 px-2 py-0.5 text-xs font-medium text-[#4B5945] dark:bg-[#4B5945]/40 dark:text-[#91AC8F]">
                {reviews.length}
              </span>
            )}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-[#232A1F]" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#B2C9AD] p-10 text-center dark:border-[#374033]">
              <p className="text-sm text-gray-500 dark:text-[#91AC8F]">You haven&apos;t written any reviews yet.</p>
              <Link
                href="/courses"
                className="mt-2 inline-flex items-center gap-1 text-sm text-[#4B5945] hover:underline dark:text-[#91AC8F]"
              >
                Browse courses <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </section>

        {/* ── Course requests ── */}
        {courseRequests.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-[#4B5945] dark:text-[#B2C9AD]">Course Requests</h2>
            <div className="flex flex-col gap-2">
              {courseRequests.map((req) => (
                <div
                  key={req.id}
                  className={`rounded-xl border p-4 ${
                    req.status === "accepted"
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                      : req.status === "rejected"
                      ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                      : "border-gray-200 bg-gray-50 dark:border-[#374033] dark:bg-[#1B2018]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-[#E8EFE6]">
                      {req.subject.toUpperCase()} {req.course_number} — {req.class_name}
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      req.status === "accepted"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        : req.status === "rejected"
                        ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === "rejected" && req.denial_reason && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Reason: {req.denial_reason}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 dark:text-[#66785F]">
                    {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Danger zone ── */}
        <div className="rounded-xl border border-red-200 bg-white p-5 dark:border-red-900/50 dark:bg-[#232A1F]">
          <h2 className="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          <p className="mb-3 text-xs text-gray-500 dark:text-[#91AC8F]">
            Permanently deletes your account, reviews, and all associated data. Cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Delete account
          </button>
        </div>

      </div>
    </div>
  );
}
