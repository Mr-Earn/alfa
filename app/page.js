import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, MessageCircle, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const featureCards = [
  {
    title: "Student dashboard",
    description: "AI-guided accommodation matching, roommate preferences, maintenance requests, and support workflows.",
    icon: GraduationCap,
    href: "/student-hub",
  },
  {
    title: "Owner workspace",
    description: "Create and manage listings, approve lease requests, and keep communication flowing with residents.",
    icon: Building2,
    href: "/user/owner",
  },
  {
    title: "University portal",
    description: "Coordinate student oversight, housing approvals, compliance, and campus communications from one place.",
    icon: ShieldCheck,
    href: "/user/university",
  },
  {
    title: "Agent & admin tools",
    description: "Support applicants, manage bookings, and monitor the full accommodation operation with role-based access.",
    icon: Users,
    href: "/user",
  },
];

const steps = [
  "Create a profile and select your role",
  "Access the right dashboard for your workflow",
  "Manage listings, students, approvals, and support in one place",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#ffffff_100%)]">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-16 lg:py-16">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.28)] backdrop-blur md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4" />
                Student accommodation, reimagined
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                A modern platform for students, owners, universities, and agents.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Discover trusted housing, manage approvals, and support every step of the student living journey from one connected experience.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/rent">
                  <Button className="gap-2">
                    Browse listings
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="outline" className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                    Open your dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-lg">
              <div className="mb-5 flex items-center gap-2 text-sm text-slate-300">
                <MessageCircle className="h-4 w-4" />
                Everything in one workspace
              </div>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-semibold text-blue-200">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-200">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.title} href={feature.href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-2 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  Explore dashboard
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Why this platform</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Built to support every stage of the student housing journey.</h2>
              <p className="mt-3 text-slate-600">
                From first search to final approval, the experience is structured around role-based dashboards that keep actions clear and focused.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              Trusted by students, university partners, and property teams
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
