"use client";

import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PanelCard from "@/components/common/PanelCard";
import { Bot, Code2, LayoutPanelTop, MonitorPlay, Sparkles } from "lucide-react";

const activity = [
  "Planning the application architecture",
  "Scaffolding the project shell",
  "Applying the premium UI system",
  "Preparing preview and deployment assets",
];

export default function WorkspacePage() {
  const params = useParams<{ projectId: string }>();

  return (
    <AppShell title={`Workspace • ${params.projectId ?? "project"}`} description="Inspect generated code, monitor AI activity, and refine the live preview in one focused workspace.">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.3fr_0.9fr]">
        <div className="space-y-6">
          <PanelCard title="Files" description="Your scaffolded structure and editable modules." className="min-h-[240px]">
            <div className="space-y-3">
              {[
                { label: "app/page.tsx", icon: LayoutPanelTop },
                { label: "components/ui/button.tsx", icon: Code2 },
                { label: "lib/api/generate.ts", icon: Bot },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#0D0D0D] px-3 py-3 text-sm text-zinc-300">
                  <item.icon className="h-4 w-4 text-[#D4AF37]" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Assets" description="Core design and product assets ready for delivery.">
            <div className="flex flex-wrap gap-2">
              {[
                "Brand system",
                "Components",
                "Illustrations",
                "Motion presets",
              ].map((asset) => (
                <span key={asset} className="rounded-full border border-zinc-800 bg-[#0D0D0D] px-3 py-1 text-sm text-zinc-400">
                  {asset}
                </span>
              ))}
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Prompt & generated code" description="Review the AI-generated implementation and the latest adjustments.">
            <div className="rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-4 text-sm leading-7 text-zinc-300">
              <p className="text-[#D4AF37]">Prompt</p>
              <p className="mt-2">Create a premium AI workspace with a polished dashboard, intelligent chat, and an elegant generation experience.</p>
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#111111] p-4">
                <p className="text-[#D4AF37]">Generated code</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-400">{`export default function Workspace() {\n  return <div className="premium-shell" />;\n}`}</pre>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="AI modifications" description="Suggested refinement steps and next actions.">
            <div className="space-y-3">
              {[
                "Add richer onboarding states",
                "Improve loading micro-interactions",
                "Tune the dashboard metric cards",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-3 text-sm text-zinc-300">
                  {item}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Live preview" description="See the current state of your generated experience." action={<MonitorPlay className="h-4 w-4 text-[#D4AF37]" />}>
            <div className="rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-5 text-center text-sm text-zinc-400">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                <Sparkles className="h-8 w-8" />
              </div>
              <p className="mt-4">Preview ready for your generated app.</p>
            </div>
          </PanelCard>

          <PanelCard title="AI activity timeline" description="Execution progress and generation checkpoints.">
            <div className="space-y-3">
              {activity.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-3 text-sm text-zinc-300">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#D4AF37]" />
                  <div>
                    <p>{item}</p>
                    <p className="mt-1 text-xs text-zinc-500">Step {index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </AppShell>
  );
}
