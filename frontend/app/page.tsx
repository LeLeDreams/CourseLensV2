import Link from "next/link";
import { BookOpen, ChartBar, MagnifyingGlass, Star } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">

      {/* Hero */}
      <section className="bg-[#4B5945] px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#91AC8F] px-4 py-1.5 text-sm text-[#B2C9AD]">
            <BookOpen size={15} weight="duotone" />
            UMass Amherst Course Reviews
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find the right course<br className="hidden sm:block" /> before you register
          </h1>
          <p className="mt-6 text-lg text-[#B2C9AD] sm:text-xl">
            Real ratings, grade distributions, and workload insights from students who've been there.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-[#4B5945] shadow-sm transition-colors hover:bg-[#B2C9AD]"
            >
              Browse Courses
              <MagnifyingGlass size={16} weight="bold" />
            </Link>
            <Link
              href="/login"
              className="inline-flex rounded-lg border border-[#91AC8F] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#66785F]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-[#B2C9AD] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-[#4B5945]">20+</p>
            <p className="text-sm text-gray-500">Courses</p>
          </div>
          <div className="hidden h-8 w-px bg-[#B2C9AD] sm:block" />
          <div>
            <p className="text-2xl font-bold text-[#4B5945]">10</p>
            <p className="text-sm text-gray-500">Departments</p>
          </div>
          <div className="hidden h-8 w-px bg-[#B2C9AD] sm:block" />
          <div>
            <p className="text-2xl font-bold text-[#4B5945]">100+</p>
            <p className="text-sm text-gray-500">Student Reviews</p>
          </div>
          <div className="hidden h-8 w-px bg-[#B2C9AD] sm:block" />
          <div>
            <p className="text-2xl font-bold text-[#4B5945]">Free</p>
            <p className="text-sm text-gray-500">Always</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-[#4B5945] sm:text-3xl">
            Everything you need to pick the right class
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[#B2C9AD] bg-white p-6">
              <div className="mb-4 inline-flex rounded-lg bg-[#B2C9AD]/40 p-3">
                <MagnifyingGlass size={22} weight="duotone" color="#4B5945" />
              </div>
              <h3 className="mb-2 font-semibold text-[#4B5945]">Search &amp; Filter</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Find courses by department, level, credits, or instructor. Narrow down quickly with side-by-side comparisons.
              </p>
            </div>
            <div className="rounded-xl border border-[#B2C9AD] bg-white p-6">
              <div className="mb-4 inline-flex rounded-lg bg-[#B2C9AD]/40 p-3">
                <Star size={22} weight="duotone" color="#4B5945" />
              </div>
              <h3 className="mb-2 font-semibold text-[#4B5945]">Honest Reviews</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                See overall ratings, difficulty scores, and written comments from students who took the course.
              </p>
            </div>
            <div className="rounded-xl border border-[#B2C9AD] bg-white p-6">
              <div className="mb-4 inline-flex rounded-lg bg-[#B2C9AD]/40 p-3">
                <ChartBar size={22} weight="duotone" color="#4B5945" />
              </div>
              <h3 className="mb-2 font-semibold text-[#4B5945]">Course Analytics</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Grade distributions, GPA trends by semester, workload data, and per-instructor breakdowns.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-[#4B5945] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#66785F]"
            >
              Browse all courses
              <MagnifyingGlass size={15} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
