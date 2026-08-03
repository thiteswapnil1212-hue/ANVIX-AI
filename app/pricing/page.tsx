import AppShell from "@/components/layout/AppShell";
import PanelCard from "@/components/common/PanelCard";
import { CheckCircle2, Sparkles } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    description: "For solo builders and early-stage product teams.",
    features: ["Unlimited projects", "AI chat", "Basic analytics"],
  },
  {
    name: "Pro",
    price: "$99",
    description: "For fast-moving startups shipping production apps.",
    features: ["Advanced agents", "Priority generation", "Workspace collaboration"],
  },
  {
    name: "Scale",
    price: "Custom",
    description: "For organizations that need secure, high-volume execution.",
    features: ["Dedicated onboarding", "Custom deployments", "Enterprise controls"],
  },
];

export default function PricingPage() {
  return (
    <AppShell title="Pricing" description="Choose the plan that matches your team’s shipping velocity and sophistication.">
      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <PanelCard key={tier.name} title={tier.name} description={tier.description}>
            <div className="rounded-2xl border border-zinc-800 bg-[#0D0D0D] p-5">
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <Sparkles className="h-4 w-4" />
                <span className="text-xl font-semibold text-white">{tier.price}</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </PanelCard>
        ))}
      </div>
    </AppShell>
  );
}
