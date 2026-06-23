import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";

export default function SiteFooter() {
  return (
    <footer className="shrink-0 border-t-2 border-[#B2C9AD] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Branding */}
          <div>
            <div className="flex items-center gap-2.5">
              <BookOpen size={22} weight="duotone" color="#4B5945" />
              <span className="text-lg font-bold text-[#4B5945]">CourseLens</span>
            </div>
            <p className="mt-2 text-sm text-[#66785F]">
              Find and review UMass courses.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#91AC8F]">
              Navigate
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/courses" className="text-[#4B5945] transition-colors hover:text-[#66785F]">
                  Browse courses
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[#4B5945] transition-colors hover:text-[#66785F]">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-[#4B5945] transition-colors hover:text-[#66785F]">
                  Create account
                </Link>
              </li>
              <li>
                <Link href="/bookmarks" className="text-[#4B5945] transition-colors hover:text-[#66785F]">
                  Saved courses
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#91AC8F]">
              About
            </h3>
            <p className="text-sm text-[#66785F]">
              A student-built course review platform for UMass Amherst. Browse
              ratings, analytics, and peer reviews to plan your schedule with
              confidence.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#4B5945] px-6 py-3">
        <p className="mx-auto max-w-6xl text-center text-xs text-[#B2C9AD]">
          &copy; 2025 CourseLens &mdash; UMass Amherst
        </p>
      </div>
    </footer>
  );
}
