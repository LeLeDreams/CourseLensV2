"use client";
import { supabase } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/admins";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { BookOpen, Bookmark, UserCircle, ShieldStar, SignOut } from "@phosphor-icons/react";

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#66785F] dark:text-[#B2C9AD] dark:hover:bg-[#4B5945]/40 dark:hover:text-[#E8EFE6]";

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
    <header className="shrink-0 border-b border-[#B2C9AD] bg-white px-6 py-3 dark:border-[#374033] dark:bg-[#1B2018]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80">
          <BookOpen size={24} weight="duotone" className="text-[#4B5945] dark:text-[#91AC8F]" />
          <div>
            <span className="block text-lg font-bold leading-tight text-[#4B5945] dark:text-[#B2C9AD]">CourseLens</span>
            <span className="hidden text-[10px] leading-none text-[#66785F] sm:block dark:text-[#91AC8F]">UMass Amherst</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {/* Primary link */}
          <Link
            href="/courses"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/40 hover:text-[#66785F] dark:text-[#B2C9AD] dark:hover:bg-[#4B5945]/40 dark:hover:text-[#E8EFE6]"
          >
            Browse courses
          </Link>

          {session ? (
            <>
              {/* Divider */}
              <div className="mx-1.5 h-5 w-px bg-[#B2C9AD] dark:bg-[#374033]" aria-hidden />

              {/* Icon actions */}
              <Link href="/bookmarks" className={iconBtn} title="Saved courses" aria-label="Saved courses">
                <Bookmark size={18} weight="duotone" />
              </Link>

              <Link href="/profile" className={iconBtn} title="Profile" aria-label="Profile">
                <UserCircle size={18} weight="duotone" />
              </Link>

              {isAdmin(session.user.email) && (
                <Link href="/admin" className={iconBtn} title="Admin panel" aria-label="Admin panel">
                  <ShieldStar size={18} weight="duotone" />
                </Link>
              )}

              {/* Divider */}
              <div className="mx-1.5 h-5 w-px bg-[#B2C9AD] dark:bg-[#374033]" aria-hidden />

              <button
                onClick={handleSignOut}
                className={iconBtn}
                title="Sign out"
                aria-label="Sign out"
              >
                <SignOut size={18} weight="duotone" />
              </button>
            </>
          ) : (
            <>
              <div className="mx-1.5 h-5 w-px bg-[#B2C9AD] dark:bg-[#374033]" aria-hidden />
              <Link
                href="/login"
                className="rounded-lg border border-[#91AC8F] px-3 py-1.5 text-sm font-medium text-[#4B5945] transition-colors hover:bg-[#B2C9AD]/30 dark:border-[#66785F] dark:text-[#B2C9AD] dark:hover:bg-[#4B5945]/30"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#4B5945] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#66785F]"
              >
                Create account
              </Link>
            </>
          )}

          <div className="mx-0.5 h-5 w-px bg-[#B2C9AD] dark:bg-[#374033]" aria-hidden />
          <ThemeToggle />
        </nav>

      </div>
    </header>
  );
}
