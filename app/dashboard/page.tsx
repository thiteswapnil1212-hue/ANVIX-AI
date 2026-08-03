import AppShell from "@/components/layout/AppShell";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

const projects = [
  {
    title: "Apex CRM",
    description: "An AI-native CRM with lead scoring, intelligent reminders, and a premium support experience.",
    updatedAt: "Updated 2 hours ago",
    href: "/workspace/apex-crm",
    accent: "Live",
  },
  {
    title: "Northstar Studio",
    description: "A beautiful studio dashboard for creative teams with approval flows and analytics.",
    updatedAt: "Updated yesterday",
    href: "/workspace/northstar-studio",
    accent: "Draft",
  },
  {
    title: "Signal AI",
    description: "An operations copilot for internal teams featuring real-time automation and summaries.",
    updatedAt: "Updated 3 days ago",
    href: "/workspace/signal-ai",
    accent: "Ready",
  },
];

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Monitor your recent work, jump back into active builds, and open your latest AI-generated products."
      action={
        <Link href="/generate" className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#E2C259]">
          <Plus className="h-4 w-4" />
          New project
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent projects</h2>
              <p className="mt-2 text-sm text-zinc-400">Your latest AI-generated applications and product concepts.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.title} {...project} />
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-zinc-800/80 bg-[#111111]/80 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">Momentum</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">Stay in flow with fast iteration, guided generation, and a workspace built for ship-ready software.</p>

          <div className="mt-6 space-y-4">
            {[
              { label: "Projects generated", value: "24" },
              { label: "Active chats", value: "8" },
              { label: "Average ship time", value: "3.2d" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-4">
                <p className="text-sm text-zinc-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-[#D4AF37]">{item.value}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
