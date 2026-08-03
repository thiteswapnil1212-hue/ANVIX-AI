import AppShell from "@/components/layout/AppShell";
import PanelCard from "@/components/common/PanelCard";
import { KeyRound, MoonStar, ShieldCheck, Sparkles } from "lucide-react";

const settingsSections = [
  {
    title: "Profile",
    description: "Manage your identity, contact details, and team preferences.",
    icon: ShieldCheck,
  },
  {
    title: "Theme",
    description: "Switch between premium dark modes and accent themes.",
    icon: MoonStar,
  },
  {
    title: "Billing",
    description: "Update your plan, invoice preferences, and usage limits.",
    icon: Sparkles,
  },
  {
    title: "API Keys",
    description: "Securely manage your connected providers and credentials.",
    icon: KeyRound,
  },
];

export default function SettingsPage() {
  return (
    <AppShell title="Settings" description="Customize your workspace, billing, and AI integrations in one place.">
      <div className="grid gap-6 md:grid-cols-2">
        {settingsSections.map((section) => (
          <PanelCard key={section.title} title={section.title} description={section.description}>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-4 text-sm text-zinc-300">
              <section.icon className="h-4 w-4 text-[#D4AF37]" />
              <span>Configured for your production workflow.</span>
            </div>
          </PanelCard>
        ))}
      </div>
    </AppShell>
  );
}
