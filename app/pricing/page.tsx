"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Crown,
  Globe2,
  Lock,
  Sparkles,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

const tiers = [
  {
    name: "Launch",
    price: "$29",
    period: "/month",
    description:
      "Everything you need to turn ideas into intelligent products.",
    icon: Zap,
    eyebrow: "For individuals",
    features: [
      "Unlimited projects",
      "AI chat",
      "Basic analytics",
      "Core AI models",
      "Community support",
    ],
    button: "Start Creating",
    popular: false,
    accent: "Starter",
    usage: "Perfect for getting started",
  },
  {
    name: "Accelerate",
    price: "$99",
    period: "/month",
    description:
      "For ambitious builders ready to move from ideas to execution at full speed.",
    icon: Sparkles,
    eyebrow: "For serious builders",
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
    accent: "Most popular",
    usage: "Best value for active builders",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For organizations ready to deploy AI with enterprise-grade power and control.",
    icon: Crown,
    eyebrow: "For organizations",
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
    accent: "Scale",
    usage: "Built for larger teams",
  },
];

const faqs = [
  {
    question: "Can I upgrade later?",
    answer:
      "Yes. Start with the plan that fits your workflow today and move to a higher tier when your usage grows.",
  },
  {
    question: "Which plan is best for most users?",
    answer:
      "Accelerate is the best fit for users who actively build with AI and want advanced agents, collaboration, analytics, and higher limits.",
  },
  {
    question: "Do I get all future ANVIX improvements?",
    answer:
      "Your plan continues to determine which capabilities and limits are available as the platform evolves.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <AppShell
      title="Plans & Possibilities"
      description="Choose the power that matches your ambition."
    >
      <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
        {/* =========================================================
            HERO
        ========================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[32px]
            border
            border-zinc-800/80
            bg-[#0F0F11]
            px-6
            py-12
            text-center
            shadow-[0_20px_70px_rgba(0,0,0,0.25)]
            sm:px-10
            sm:py-16
          "
        >
          {/* Background glow */}

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              left-1/2
              top-[-180px]
              h-[420px]
              w-[420px]
              -translate-x-1/2
              rounded-full
              bg-[#D4AF37]/[0.09]
              blur-[120px]
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-[-180px]
              left-1/2
              h-[280px]
              w-[280px]
              -translate-x-1/2
              rounded-full
              bg-[#D4AF37]/[0.035]
              blur-[100px]
            "
          />

          <div className="relative mx-auto max-w-4xl">
            {/* Badge */}

            <div
              className="
                mx-auto
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#D4AF37]/20
                bg-[#D4AF37]/[0.06]
                px-3.5
                py-1.5
                shadow-[0_0_30px_rgba(212,175,55,0.04)]
              "
            >
              <Sparkles
                className="h-3.5 w-3.5 text-[#D4AF37]"
                strokeWidth={1.8}
              />

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#D4AF37]
                "
              >
                Choose your power
              </span>
            </div>

            {/* Heading */}

            <h1
              className="
                mt-6
                text-4xl
                font-semibold
                tracking-[-0.03em]
                text-white
                sm:text-6xl
              "
            >
              Build faster.
              <br />

              <span
                className="
                  bg-gradient-to-r
                  from-[#D4AF37]
                  via-[#E4C766]
                  to-[#D4AF37]
                  bg-clip-text
                  text-transparent
                "
              >
                Think bigger.
              </span>
            </h1>

            <p
              className="
                mx-auto
                mt-5
                max-w-2xl
                text-sm
                leading-7
                text-zinc-500
                sm:text-base
              "
            >
              Start small, build without friction, and unlock
              more intelligence when your ideas demand it.
            </p>

            {/* Trust */}

            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Check
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  strokeWidth={2.2}
                />
                No long-term commitment
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Check
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  strokeWidth={2.2}
                />
                Upgrade when you need more
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Check
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  strokeWidth={2.2}
                />
                Built around your workflow
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            VALUE STRIP
        ========================================================= */}

        <section className="grid gap-3 sm:grid-cols-3">
          <div
            className="
              rounded-2xl
              border
              border-zinc-800
              bg-[#111111]
              px-4
              py-4
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#D4AF37]/[0.07]
                  text-[#D4AF37]
                "
              >
                <Zap className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-300">
                  AI-first workflow
                </p>

                <p className="mt-0.5 text-[10px] text-zinc-600">
                  From idea to execution
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              rounded-2xl
              border
              border-zinc-800
              bg-[#111111]
              px-4
              py-4
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#D4AF37]/[0.07]
                  text-[#D4AF37]
                "
              >
                <Users className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-300">
                  Built for collaboration
                </p>

                <p className="mt-0.5 text-[10px] text-zinc-600">
                  Share and build together
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              rounded-2xl
              border
              border-zinc-800
              bg-[#111111]
              px-4
              py-4
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#D4AF37]/[0.07]
                  text-[#D4AF37]
                "
              >
                <Globe2 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-300">
                  Ready to scale
                </p>

                <p className="mt-0.5 text-[10px] text-zinc-600">
                  From solo to enterprise
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            PRICING GRID
        ========================================================= */}

        <section className="grid gap-5 lg:grid-cols-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;

            return (
              <article
                key={tier.name}
                className={`
                  group
                  relative
                  flex
                  min-h-[610px]
                  flex-col
                  overflow-hidden
                  rounded-[28px]
                  border
                  bg-[#111113]
                  transition-all
                  duration-300
                  ease-out

                  ${
                    tier.popular
                      ? `
                        border-[#D4AF37]/35
                        shadow-[0_20px_60px_rgba(212,175,55,0.08)]
                        lg:-translate-y-2
                        lg:hover:-translate-y-3
                      `
                      : `
                        border-zinc-800
                        hover:-translate-y-1
                        hover:border-zinc-700
                        hover:shadow-[0_18px_45px_rgba(0,0,0,0.25)]
                      `
                  }
                `}
              >
                {/* =================================================
                    CARD GLOW
                ================================================= */}

                <div
                  aria-hidden="true"
                  className={`
                    pointer-events-none
                    absolute
                    left-1/2
                    top-[-100px]
                    h-56
                    w-56
                    -translate-x-1/2
                    rounded-full
                    blur-[90px]
                    transition-opacity
                    duration-500

                    ${
                      tier.popular
                        ? "bg-[#D4AF37]/[0.11] opacity-100"
                        : "bg-[#D4AF37]/[0.04] opacity-0 group-hover:opacity-100"
                    }
                  `}
                />

                {/* =================================================
                    POPULAR BADGE
                ================================================= */}

                {tier.popular && (
                  <div
                    className="
                      absolute
                      right-5
                      top-5
                      z-10
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      bg-[#D4AF37]
                      px-3
                      py-1.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-black
                      shadow-[0_0_20px_rgba(212,175,55,0.18)]
                    "
                  >
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                )}

                {/* =================================================
                    CARD CONTENT
                ================================================= */}

                <div className="relative z-10 flex flex-1 flex-col p-6 sm:p-7">
                  {/* Icon */}

                  <div
                    className={`
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      border
                      transition-all
                      duration-300

                      ${
                        tier.popular
                          ? `
                            border-[#D4AF37]/20
                            bg-[#D4AF37]/[0.09]
                            text-[#D4AF37]
                            group-hover:scale-105
                            group-hover:shadow-[0_0_25px_rgba(212,175,55,0.08)]
                          `
                          : `
                            border-zinc-800
                            bg-[#0D0D0F]
                            text-zinc-400
                            group-hover:scale-105
                          `
                      }
                    `}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.7}
                    />
                  </div>

                  {/* Eyebrow */}

                  <p
                    className="
                      mt-6
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.15em]
                      text-zinc-600
                    "
                  >
                    {tier.eyebrow}
                  </p>

                  {/* Name */}

                  <div className="mt-1.5">
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {tier.name}
                    </h2>

                    <p className="mt-2 min-h-[52px] text-sm leading-6 text-zinc-500">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}

                  <div className="mt-7">
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-semibold tracking-tight text-white">
                        {tier.price}
                      </span>

                      {tier.period && (
                        <span className="mb-1.5 text-xs text-zinc-600">
                          {tier.period}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[10px] text-zinc-700">
                      {tier.usage}
                    </p>
                  </div>

                  {/* CTA */}

                  <button
                    type="button"
                    className={`
                      mt-7
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      px-4
                      py-3.5
                      text-sm
                      font-semibold
                      transition-all
                      duration-200

                      ${
                        tier.popular
                          ? `
                            bg-[#D4AF37]
                            text-black

                            hover:scale-[1.01]
                            hover:bg-[#E3C45F]
                            hover:shadow-[0_10px_30px_rgba(212,175,55,0.18)]

                            active:scale-[0.99]
                          `
                          : `
                            border
                            border-zinc-800
                            bg-[#0D0D0F]
                            text-zinc-200

                            hover:border-zinc-700
                            hover:bg-[#171719]
                            hover:text-white

                            active:scale-[0.99]
                          `
                      }
                    `}
                  >
                    {tier.button}

                    <ArrowRight
                      className="
                        h-4
                        w-4
                        transition-transform
                        duration-200
                        group-hover:translate-x-0.5
                      "
                    />
                  </button>

                  {/* Divider */}

                  <div className="my-7 h-px bg-zinc-800/80" />

                  {/* Feature heading */}

                  <div className="flex items-center justify-between">
                    <p
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.15em]
                        text-zinc-600
                      "
                    >
                      Everything included
                    </p>

                    <span className="text-[10px] text-zinc-700">
                      {tier.features.length} features
                    </span>
                  </div>

                  {/* Features */}

                  <ul className="mt-4 space-y-3.5">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="
                          flex
                          items-start
                          gap-3
                          text-sm
                          text-zinc-300
                        "
                      >
                        <span
                          className={`
                            mt-0.5
                            flex
                            h-4
                            w-4
                            shrink-0
                            items-center
                            justify-center
                            rounded-full

                            ${
                              tier.popular
                                ? "bg-[#D4AF37]/10"
                                : "bg-zinc-800"
                            }
                          `}
                        >
                          <Check
                            className={`
                              h-2.5
                              w-2.5

                              ${
                                tier.popular
                                  ? "text-[#D4AF37]"
                                  : "text-zinc-400"
                              }
                            `}
                            strokeWidth={2.2}
                          />
                        </span>

                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom accent */}

                <div
                  className={`
                    absolute
                    bottom-0
                    left-0
                    h-px
                    transition-all
                    duration-500

                    ${
                      tier.popular
                        ? "w-full bg-[#D4AF37]/35"
                        : "w-0 bg-[#D4AF37]/30 group-hover:w-20"
                    }
                  `}
                />
              </article>
            );
          })}
        </section>

        {/* =========================================================
            TRUST / SECURITY
        ========================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-3xl
            border
            border-zinc-800
            bg-[#111113]
            px-5
            py-6
            sm:px-7
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              right-0
              top-0
              h-32
              w-32
              rounded-full
              bg-emerald-400/[0.025]
              blur-3xl
            "
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-emerald-500/15
                  bg-emerald-500/[0.05]
                "
              >
                <ShieldCheck
                  className="h-5 w-5 text-emerald-400"
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Built for real AI workflows
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                  From solo experimentation to larger
                  deployments, ANVIX is designed to grow
                  with how you build.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-zinc-800
                  bg-[#0D0D0F]
                  px-3
                  py-1.5
                  text-[10px]
                  text-zinc-500
                "
              >
                <Lock className="h-3 w-3" />
                Secure workspace
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-zinc-800
                  bg-[#0D0D0F]
                  px-3
                  py-1.5
                  text-[10px]
                  text-zinc-500
                "
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                AI online
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================
            FAQ
        ========================================================= */}

        <section
          className="
            rounded-3xl
            border
            border-zinc-800
            bg-[#111113]
            p-6
            sm:p-8
          "
        >
          <div className="max-w-2xl">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#D4AF37]
              "
            >
              Questions
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Still deciding?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              A few things worth knowing before you choose.
            </p>
          </div>

          <div className="mt-7 divide-y divide-zinc-800/80">
            {faqs.map((faq, index) => {
              const open = openFaq === index;

              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(open ? null : index)
                    }
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-4
                      py-4
                      text-left
                    "
                  >
                    <span className="text-sm font-medium text-zinc-300">
                      {faq.question}
                    </span>

                    <ChevronDown
                      className={`
                        h-4
                        w-4
                        shrink-0
                        text-zinc-600
                        transition-transform
                        duration-200

                        ${open ? "rotate-180" : ""}
                      `}
                    />
                  </button>

                  <div
                    className={`
                      grid
                      transition-all
                      duration-200
                      ${
                        open
                          ? "grid-rows-[1fr] pb-4"
                          : "grid-rows-[0fr]"
                      }
                    `}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl text-sm leading-6 text-zinc-600">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[32px]
            border
            border-[#D4AF37]/15
            bg-[#111113]
            px-6
            py-10
            text-center
            shadow-[0_20px_70px_rgba(0,0,0,0.20)]
            sm:px-10
            sm:py-12
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              left-1/2
              top-1/2
              h-48
              w-48
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-[#D4AF37]/[0.06]
              blur-[80px]
            "
          />

          <div className="relative">
            <div
              className="
                mx-auto
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-[#D4AF37]/15
                bg-[#D4AF37]/[0.07]
              "
            >
              <Sparkles
                className="h-5 w-5 text-[#D4AF37]"
                strokeWidth={1.7}
              />
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">
              Your next build starts here.
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Choose a plan, open your workspace, and let
              ANVIX turn your next idea into something real.
            </p>

            <button
              type="button"
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[#D4AF37]
                px-5
                py-3
                text-sm
                font-semibold
                text-black

                transition-all
                duration-200

                hover:scale-[1.02]
                hover:bg-[#E3C45F]
                hover:shadow-[0_10px_30px_rgba(212,175,55,0.16)]

                active:scale-[0.99]
              "
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}