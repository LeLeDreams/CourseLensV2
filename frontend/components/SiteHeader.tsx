"use client";
import { supabase } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/admins";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { BookOpen } from "@phosphor-icons/react";

export default function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showToast("Signed out successfully.", "success");
    router.push("/login");
  };

  return (
    <header className="shrink-0 border-b-2 border-[#B2C9AD] bg-white px-6 py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80">
          <BookOpen size={26} weight="duotone" color="#4B5945" />
          <div>
            <span className="block text-xl font-bold leading-tight text-[#4B5945]">CourseLens</span>
            <span className="block text-xs text-[#66785F]">Find and review UMass courses</span>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-medium">
          <Link
            href="/courses"
            className="rounded-md px-3 py-1.5 text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#66785F]"
          >
            Browse courses
          </Link>

          {session && (
            <Link
              href="/bookmarks"
              className="rounded-md px-3 py-1.5 text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#66785F]"
            >
              Saved
            </Link>
          )}

          {session ? (
            <>
              <Link
                href="/profile"
                className="rounded-md px-3 py-1.5 text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#66785F]"
              >
                Profile
              </Link>
              {isAdmin(session.user.email) && (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-1.5 font-semibold text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#66785F]"
                >
                  Admin
                </Link>
              )}
              <div className="mx-1 h-4 w-px bg-[#B2C9AD]" aria-hidden />
              <button
                onClick={handleSignOut}
                className="rounded-md px-3 py-1.5 text-[#66785F] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#4B5945]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="mx-1 h-4 w-px bg-[#B2C9AD]" aria-hidden />
              <Link
                href="/login"
                className="rounded-md border border-[#91AC8F] px-3 py-1.5 text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/30"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[#4B5945] px-3 py-1.5 text-white transition-colors hover:bg-[#66785F]"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
