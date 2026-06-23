"use client";

import { useToast } from "@/components/ToastProvider";
import { clearCourseCache } from "@/lib/course-cache";
import { supabase } from "@/lib/supabase/client";
import type { Course } from "@/types/course";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useState } from "react";


export default function EvaluateCoursePage() {
  const { id } = useParams();
  const router = useRouter();
  const courseId = Number(id);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [studentProfileId, setStudentProfileId] = useState<number | null>(null);

  const [rating, setRating] = useState(4);
  const [difficulty, setDifficulty] = useState(3);
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState("");
  const [comment, setComment] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState<number | "">("");
  const [courseProfessors, setCourseProfessors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [profileSetupError, setProfileSetupError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);

  const redirectToLogin = `/login?redirect=${encodeURIComponent(`/courses/${courseId}/evaluate`)}`;
  const { showToast } = useToast();

  useEffect(() => {
    if (!Number.isFinite(courseId)) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data: courseRow, error: courseError } = await supabase
        .from("course_metrics")
        .select("*")
        .eq("id", courseId)
        .single();

        const { data: profRows } = await supabase
        .from("professor_classes")
        .select("professor(name)")
        .eq("class_id", courseId);

        if (profRows) {
          const names = profRows.map((r: any) => r.professor?.name).filter(Boolean);
          setCourseProfessors(names);
        }
        if (!courseError && courseRow) setCourse(courseRow as Course);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      setSessionUser(user);

      if (!user) {
        setStudentProfileId(null);
        setProfileSetupError(null);
        setLoading(false);
        return;
      }

      setProfileSetupError(null);
      let profileId: number | null = null;

      const { data: profile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.id != null) {
        profileId = Number(profile.id);
      } else {
        const { data: upserted, error: upsertError } = await supabase
          .from("student_profiles")
          .upsert(
            { user_id: user.id, email: user.email ?? null },
            { onConflict: "user_id" }
          )
          .select("id")
          .single();

        if (upsertError) {
          setProfileSetupError(upsertError.message);
        } else if (upserted?.id != null) {
          profileId = Number(upserted.id);
        }
      }

      setStudentProfileId(profileId);

      if (profileId) {
        const { data: existing } = await supabase
          .from("course_evaluations")
          .select("*")
          .eq("course_id", courseId)
          .eq("student_profile_id", profileId)
          .maybeSingle();

        if (existing) {
          setReviewId(existing.id);
          setRating(existing.rating);
          setDifficulty(existing.difficulty);
          setGrade(existing.grade ?? "");
          setSemester(existing.semester ?? "");
          setComment(existing.comment ?? "");
          setProfessorName(existing.professor_name ?? "");
          setHoursPerWeek(existing.hours_per_week ?? "");
        }
      }

      setLoading(false);
    }

    load();
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!studentProfileId) {
      setMessage("Could not resolve your student profile. Check that student_profiles exists and RLS allows insert.");
      return;
    }

    setSubmitting(true);

    let error;

    if(reviewId){
      ({ error } = await supabase
        .from("course_evaluations")
        .update({
          rating,
          difficulty,
          grade: grade || null,
          semester: semester.trim() || null,
          comment: comment.trim() || null,
          professor_name: professorName || null,
          hours_per_week: hoursPerWeek !== "" ? hoursPerWeek : null,
    })
    .eq("id", reviewId));
  } else {
    ({ error } = await supabase
        .from("course_evaluations")
        .insert({
          course_id: courseId,
          student_profile_id: studentProfileId,
          rating,
          difficulty,
          grade: grade || null,
          semester: semester.trim() || null,
          comment: comment.trim() || null,
          professor_name: professorName || null,
          hours_per_week: hoursPerWeek !== "" ? hoursPerWeek : null,
    }));
  } 

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      showToast("Review submit failed.", "error");
      return;
    }
    clearCourseCache(courseId);
    showToast("Review created successfully.", "success");
    router.push(`/courses/${courseId}`);
  };

  const handleDeleteReview = async () => {
          if (!studentProfileId) return;
  
          const confirmDelete = confirm("Are you sure you want to delete your review? This action cannot be undone.");
  
          if (!confirmDelete) return;
  
          const { error } = await supabase
          .from('course_evaluations')
          .delete()
          .eq('id', reviewId);

          if (error) {
            console.error('Error deleting row:', error);
          } else {
            router.push(`/courses/${courseId}`);
          }
      };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-background">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-background px-4">
        <p className="text-gray-500 text-center">Course not found.</p>
      </div>
    );
  }

  if (sessionUser && studentProfileId === null) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-background px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md text-center shadow-sm">
          <p className="text-gray-800 mb-2">Could not create your student profile.</p>
          {profileSetupError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-left text-xs text-red-800">{profileSetupError}</p>
          )}
          <p className="text-sm text-gray-500 mb-4">
            In Supabase → SQL → run the full script in{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">data_management/supabase_course_evaluations.sql</code>{" "}
            (it drops the <code className="text-xs bg-gray-100 px-1">auth.users</code> foreign key, adds grants, and fixes RLS). Then refresh this page.
          </p>
          <Link href={`/courses/${courseId}`} className="text-[#4B5945] text-sm hover:text-[#66785F] hover:underline">
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-background px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <p className="text-xs font-semibold bg-[#B2C9AD]/50 text-[#4B5945] inline-block px-2 py-1 rounded-full">{course.code}</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">{course.name}</p>
          <p className="text-gray-800 mt-4 mb-4">Sign in to add an evaluation for this course.</p>
          <Link
            href={redirectToLogin}
            className="inline-block bg-[#4B5945] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#66785F]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex-1 bg-background">
      <main className="mx-auto max-w-xl px-4 py-8">
        <Link href={`/courses/${courseId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#4B5945] hover:text-[#66785F] transition-colors">
          <ArrowLeft size={14} weight="bold" /> Back to course
        </Link>



        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">

          {reviewId &&
            <div className="flex justify-end">
              <div className="w-fit px-2 bg-red-600 hover:bg-red-800 rounded-sm mb-2">
              <button
                  onClick={handleDeleteReview}
                  className="mt-2 mb-2 text-right text-white text-sm"
                  >
                  Delete Review
              </button>
              </div>
            </div>
          }

          <p className="text-xs font-semibold bg-[#B2C9AD]/50 text-[#4B5945] inline-block px-2 py-1 rounded-full">{course.code}</p>
          <h2 className="text-xl font-bold text-gray-900 mt-2">{course.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Submitting as student ID <span className="font-mono text-gray-700">{studentProfileId}</span>
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Select grade</option>
                {["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Select semester</option>
                {["Spring 2026", "Fall 2025", "Spring 2025", "Fall 2024", "Spring 2024", "Fall 2023"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              {courseProfessors.length > 0 ? (
                <select
                  value={professorName}
                  onChange={(e) => setProfessorName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                >
                  <option value="">Select instructor</option>
                  {courseProfessors.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={professorName}
                  onChange={(e) => setProfessorName(e.target.value)}
                  placeholder="Instructor name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours per week</label>
              <input
                type="number"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 8"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty (1–5)</label>
              <input
                type="range" min={1} max={5} step={0.5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm text-gray-600 mt-1">{difficulty.toFixed(1)} / 5</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overall rating (1–5)</label>
              <input
                type="range" min={1} max={5} step={0.5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm text-gray-600 mt-1">{rating.toFixed(1)} / 5</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>

            {message && <p className="text-sm text-red-600">{message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#4B5945] text-white py-3 rounded-lg font-medium hover:bg-[#66785F] disabled:opacity-50"
            >
              {reviewId? (submitting ? "Updating…" : "Update evaluation"): (submitting ? "Submitting…" : "Submit evaluation")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
