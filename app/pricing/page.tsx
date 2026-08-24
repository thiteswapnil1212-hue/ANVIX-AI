"use client";

import AppShell from "@/components/layout/AppShell";
import {
  Check,
  CheckCircle2,
  Crown,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react";

const tiers = [
  {
    name: "Launch",
    price: "$29",
    period: "/month",
    description:
      "Everything you need to turn ideas into intelligent products.",
    icon: Zap,
    features: [
      "Unlimited projects",
      "AI chat",
      "Basic analytics",
      "Core AI models",
      "Community support",
    ],
    button: "Start Creating",
    popular: false,
  },
  {
    name: "Accelerate",
    price: "$99",
    period: "/month",
    description:
      "For ambitious teams ready to move from ideas to execution at full speed.",
    icon: Sparkles,
    features: [
      "Everything in Launch",
      "Advanced AI agents",
      "Priority generation",
      "Workspace collaboration",
      "Advanced analytics",
      "Higher usage limits",
    ],
    button: "Unlock More Power",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For organizations ready to deploy AI with enterprise-grade power and control.",
    icon: Crown,
    features: [
      "Everything in Accelerate",
      "Dedicated onboarding",
      "Custom deployments",
      "Enterprise controls",
      "Priority support",
      "Custom usage limits",
    ],
    button: "Let's Talk",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <AppShell
      title="Plans & Possibilities"
      description="Choose the power that matches your ambition."
    >
      <div className="mx-auto w-full max-w-7xl space-y-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#111113] px-6 py-10 text-center sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-140px] h-80 w-80 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[110px]"
          />

          <div className="relative mx-auto max-w-3xl">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />

              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
                Straightforward. Powerful. Yours.
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Build Beyond Limits with{" "}
              <span className="text-[#D4AF37]">ANVIX AI</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Start with what you need. Scale with everything you can imagine.
              One platform for every stage of your journey.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                No surprises
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                Built to evolve
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                Scale when you're ready
              </div>
            </div>
          </div>
        </section>

        {/* PRICING GRID */}
        <section className="grid gap-5 lg:grid-cols-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;

            return (
              <div
                key={tier.name}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-[#111113] transition-all duration-300 ${
                  tier.popular
                    ? "border-[#D4AF37]/50 shadow-[0_0_45px_rgba(212,175,55,0.08)] lg:-translate-y-2"
                    : "border-zinc-800 hover:-translate-y-1 hover:border-zinc-700"
                }`}
              >
                {/* POPULAR BADGE */}
                {tier.popular && (
                  <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
                    <Sparkles className="h-3 w-3" />
                    Most Chosen
                  </div>
                )}

                {/* TOP GLOW */}
                {tier.popular && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 h-32 w-56 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[70px]"
                  />
                )}

                <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                  {/* ICON */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      tier.popular
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/10"
                        : "border-zinc-800 bg-[#0D0D0F]"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        tier.popular
                          ? "text-[#D4AF37]"
                          : "text-zinc-400"
                      }`}
                    />
                  </div>

                  {/* NAME */}
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold text-white">
                      {tier.name}
                    </h2>

                    <p className="mt-2 min-h-[48px] text-sm leading-6 text-zinc-500">
                      {tier.description}
                    </p>
                  </div>

                  {/* PRICE */}
                  <div className="mt-7 flex items-end gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-white">
                      {tier.price}
                    </span>

                    {tier.period && (
                      <span className="mb-1 text-xs text-zinc-600">
                        {tier.period}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    className={`mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                      tier.popular
                        ? "bg-[#D4AF37] text-black hover:bg-[#E2C259] hover:shadow-lg hover:shadow-[#D4AF37]/10"
                        : "border border-zinc-800 bg-[#0D0D0F] text-zinc-200 hover:border-zinc-700 hover:bg-[#18181B] hover:text-white"
                    }`}
                  >
                    {tier.button}

                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>

                  {/* DIVIDER */}
                  <div className="my-7 h-px bg-zinc-800/80" />

                  {/* FEATURES */}
                  <div>
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Everything Inside
                    </p>

                    <ul className="space-y-3.5">
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm text-zinc-300"
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                              tier.popular
                                ? "bg-[#D4AF37]/10"
                                : "bg-zinc-800"
                            }`}
                          >
                            <Check
                              className={`h-2.5 w-2.5 ${
                                tier.popular
                                  ? "text-[#D4AF37]"
                                  : "text-zinc-400"
                              }`}
                            />
                          </span>

                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* SECURITY / TRUST */}
        <section className="rounded-2xl border border-zinc-800/80 bg-[#111113] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/5">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Powerful AI. Enterprise-Ready.
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Built with the security, control, and infrastructure your AI
                  workflows deserve.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 bg-[#0D0D0F] px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[11px] text-zinc-500">
                ANVIX is online
              </span>
            </div>
          </div>
        </section>

        {/* FAQ STYLE CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-[#111113] p-7 text-center sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/5 blur-[80px]"
          />

          <div className="relative">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10">
              <Sparkles className="h-5 w-5 text-[#D4AF37]" />
            </div>

            <h2 className="mt-4 text-xl font-semibold text-white">
              Not sure where to begin?
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Begin with what you need today. Unlock more when your ideas
              demand it.
            </p>

            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#0D0D0F] px-5 py-3 text-sm font-medium text-zinc-300 transition hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
            >
              Discover ANVIX
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}