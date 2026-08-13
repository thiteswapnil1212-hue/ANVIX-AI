import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Terminal,
  Zap,
  Code2,
  Bot,
  Layers3,
} from "lucide-react";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="
        relative
        min-h-[calc(100vh-64px)]
        overflow-hidden
        bg-[#09090B]
        px-5
        py-16
        sm:px-6
        sm:py-20
        lg:py-24
      "
    >
      {/* ================= BACKGROUND VIDEO ================= */}

      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          h-full
          w-full
          object-cover
          opacity-[0.12]
        "
      >
        <source src="/anvix-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[#09090B]/80
        "
      />

      {/* ================= GOLD GLOWS ================= */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-220px]
          h-[520px]
          w-[520px]
          -translate-x-1/2
          rounded-full
          bg-[#D4AF37]/[0.09]
          blur-[150px]
          animate-pulse
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-[-220px]
          left-[8%]
          h-[380px]
          w-[380px]
          rounded-full
          bg-[#D4AF37]/[0.045]
          blur-[140px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-[-150px]
          top-[35%]
          h-[320px]
          w-[320px]
          rounded-full
          bg-[#D4AF37]/[0.035]
          blur-[120px]
        "
      />

      {/* ================= MAIN CONTENT ================= */}

      <div className="relative z-10 mx-auto max-w-6xl">

        {/* ================= BADGE ================= */}

        <div className="flex justify-center">
          <div
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[#D4AF37]/20
              bg-[#111113]/80
              px-4
              py-2
              text-xs
              font-medium
              text-zinc-300
              shadow-[0_0_30px_rgba(212,175,55,0.04)]
              backdrop-blur-md
              transition-all
              duration-300
              hover:border-[#D4AF37]/40
              hover:bg-[#18181B]
            "
          >
            <span
              aria-hidden="true"
              className="
                relative
                flex
                h-1.5
                w-1.5
              "
            >
              <span
                className="
                  absolute
                  inline-flex
                  h-full
                  w-full
                  animate-ping
                  rounded-full
                  bg-[#D4AF37]
                  opacity-60
                "
              />

              <span
                className="
                  relative
                  inline-flex
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-[#D4AF37]
                "
              />
            </span>

            AI Software Engineering Platform
          </div>
        </div>

        {/* ================= HERO TEXT ================= */}

        <div className="mx-auto mt-8 max-w-4xl text-center sm:mt-10">

          <h1
            id="hero-title"
            className="
              text-5xl
              font-semibold
              leading-tight
              tracking-[-0.035em]
              text-white
              sm:text-6xl
              lg:text-7xl
            "
          >
            Turn ideas into
            <br />

            <span
              className="
                bg-gradient-to-r
                from-[#D4AF37]
                via-[#F0D477]
                to-[#D4AF37]
                bg-clip-text
                text-transparent
              "
            >
              working software.
            </span>
          </h1>

          <p
            className="
              mx-auto
              mt-6
              max-w-2xl
              text-base
              leading-7
              text-zinc-300
              sm:mt-7
              sm:text-lg
              sm:leading-8
            "
          >
            Build, explore, and ship software with an intelligent AI
            engineering workspace designed to turn your ideas into reality.
          </p>
        </div>

        {/* ================= CTA ================= */}

        <div
          className="
            mt-9
            flex
            flex-col
            items-center
            justify-center
            gap-3
            sm:mt-10
            sm:flex-row
          "
        >
          {/* PRIMARY CTA */}

          <Link
            href="/generate"
            className="
              group
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#D4AF37]
              px-6
              py-3.5
              text-sm
              font-semibold
              text-[#09090B]
              shadow-[0_8px_30px_rgba(212,175,55,0.08)]
              transition-all
              duration-200
              hover:scale-[1.02]
              hover:bg-[#E5C158]
              hover:shadow-[0_12px_40px_rgba(212,175,55,0.18)]
              focus:outline-none
              focus:ring-2
              focus:ring-[#D4AF37]
              focus:ring-offset-2
              focus:ring-offset-[#09090B]
              sm:w-auto
            "
          >
            Start building

            <ArrowRight
              aria-hidden="true"
              className="
                h-4
                w-4
                transition-transform
                duration-200
                group-hover:translate-x-1
              "
            />
          </Link>

          {/* SECONDARY CTA */}

          <Link
            href="/chat"
            className="
              group
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-zinc-800
              bg-[#111113]/90
              px-6
              py-3.5
              text-sm
              font-medium
              text-zinc-200
              backdrop-blur-md
              transition-all
              duration-200
              hover:scale-[1.02]
              hover:border-zinc-700
              hover:bg-[#18181B]
              hover:text-white
              focus:outline-none
              focus:ring-2
              focus:ring-zinc-600
              focus:ring-offset-2
              focus:ring-offset-[#09090B]
              sm:w-auto
            "
          >
            <Sparkles
              aria-hidden="true"
              className="
                h-4
                w-4
                text-[#D4AF37]
                transition-transform
                duration-300
                group-hover:rotate-12
              "
            />

            Talk to ANVIX
          </Link>
        </div>

        {/* ================= PRODUCT PREVIEW ================= */}

        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">

          {/* Preview glow */}

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-x-16
              top-0
              h-32
              bg-[#D4AF37]/[0.07]
              blur-[80px]
            "
          />

          <div
            className="
              group
              relative
              overflow-hidden
              rounded-2xl
              border
              border-zinc-800
              bg-[#111113]/95
              shadow-[0_30px_100px_rgba(0,0,0,0.55)]
              transition-all
              duration-500
              hover:border-zinc-700
              hover:shadow-[0_35px_120px_rgba(0,0,0,0.65)]
            "
          >

            {/* ================= WINDOW HEADER ================= */}

            <div
              className="
                flex
                h-12
                items-center
                justify-between
                border-b
                border-zinc-800
                bg-[#0F0F10]
                px-4
              "
            >

              <div
                aria-hidden="true"
                className="flex items-center gap-2"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Image
                  src="/logo.png"
                  alt="ANVIX AI"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] object-contain"
                />

                ANVIX AI
              </div>

              <div className="w-12" />
            </div>

            {/* ================= PREVIEW BODY ================= */}

            <div
              className="
                grid
                min-h-[350px]
                grid-cols-1
                md:grid-cols-[190px_1fr]
              "
            >

              {/* SIDEBAR */}

              <aside
                aria-label="Preview navigation"
                className="
                  hidden
                  border-r
                  border-zinc-800
                  bg-[#0D0D0F]
                  p-4
                  md:block
                "
              >
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">

                  <Image
                    src="/logo.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />

                  <div>
                    <p className="text-xs font-semibold text-white">
                      ANVIX AI
                    </p>

                    <p className="text-[9px] text-zinc-600">
                      Workspace
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">

                  <div
                    className="
                      rounded-lg
                      border
                      border-[#D4AF37]/10
                      bg-[#D4AF37]/[0.07]
                      px-3
                      py-2
                      text-[11px]
                      font-medium
                      text-[#D4AF37]
                    "
                  >
                    Overview
                  </div>

                  <div className="rounded-lg px-3 py-2 text-[11px] text-zinc-600 transition hover:bg-white/[0.03] hover:text-zinc-400">
                    Projects
                  </div>

                  <div className="rounded-lg px-3 py-2 text-[11px] text-zinc-600 transition hover:bg-white/[0.03] hover:text-zinc-400">
                    Conversations
                  </div>

                </div>
              </aside>

              {/* WORKSPACE */}

              <div className="bg-[#09090B] p-5 sm:p-7">

                {/* Workspace header */}

                <div className="flex items-center justify-between">

                  <div>
                    <p
                      className="
                        text-[10px]
                        uppercase
                        tracking-[0.18em]
                        text-[#D4AF37]
                      "
                    >
                      Workspace
                    </p>

                    <h2
                      className="
                        mt-2
                        text-lg
                        font-semibold
                        text-white
                        sm:text-xl
                      "
                    >
                      Build your next product
                    </h2>
                  </div>

                  <div
                    className="
                      hidden
                      items-center
                      gap-2
                      rounded-lg
                      border
                      border-zinc-800
                      bg-[#111113]
                      px-3
                      py-2
                      text-[10px]
                      text-zinc-500
                      sm:flex
                    "
                  >
                    <span
                      aria-hidden="true"
                      className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-[#D4AF37]
                      "
                    />

                    AI ready
                  </div>
                </div>

                {/* FEATURE CARDS */}

                <div
                  className="
                    mt-7
                    grid
                    gap-3
                    sm:grid-cols-3
                  "
                >
                  <PreviewCard
                    icon={<Zap aria-hidden="true" className="h-4 w-4" />}
                    title="Generate"
                    text="Turn an idea into a product blueprint."
                  />

                  <PreviewCard
                    icon={
                      <Terminal
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    }
                    title="Build"
                    text="Work with modern production-ready code."
                  />

                  <PreviewCard
                    icon={
                      <Sparkles
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    }
                    title="Iterate"
                    text="Refine your product with AI assistance."
                  />
                </div>

                {/* AI WORKSPACE */}

                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-zinc-800
                    bg-[#111113]
                    p-4
                    transition-all
                    duration-300
                    group-hover:border-zinc-700
                  "
                >

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-[#D4AF37]/20
                        bg-[#D4AF37]/10
                      "
                    >
                      <Bot
                        aria-hidden="true"
                        className="h-4 w-4 text-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-zinc-200">
                        ANVIX AI
                      </p>

                      <p className="text-[9px] text-zinc-600">
                        Ready to build
                      </p>
                    </div>

                  </div>

                  {/* Fake prompt */}

                  <div
                    className="
                      mt-4
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      border
                      border-zinc-800
                      bg-[#0D0D0F]
                      px-3
                      py-3
                    "
                  >
                    <Code2
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-zinc-600"
                    />

                    <span className="text-[11px] text-zinc-500">
                      Describe what you want to build...
                    </span>

                    <span
                      aria-hidden="true"
                      className="
                        ml-auto
                        h-6
                        w-6
                        rounded-full
                        bg-[#D4AF37]
                        opacity-80
                      "
                    />
                  </div>

                  {/* Fake loading lines */}

                  <div className="mt-4 space-y-2">

                    <div className="h-2 w-3/4 rounded-full bg-zinc-800" />

                    <div className="h-2 w-1/2 rounded-full bg-zinc-900" />

                    <div className="h-2 w-2/3 rounded-full bg-zinc-900" />

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM STATEMENT ================= */}

        <div
          className="
            mx-auto
            mt-9
            flex
            max-w-3xl
            flex-col
            items-center
            justify-center
            gap-3
            text-center
            sm:flex-row
            sm:gap-8
          "
        >
          <Feature text="Generate software" />

          <Divider />

          <Feature text="Build with AI" />

          <Divider />

          <Feature text="Ship faster" />
        </div>
      </div>
    </section>
  );
}

/* ================= FEATURE ================= */

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span
        aria-hidden="true"
        className="
          h-1.5
          w-1.5
          rounded-full
          bg-[#D4AF37]
          shadow-[0_0_8px_rgba(212,175,55,0.4)]
        "
      />

      {text}
    </div>
  );
}

/* ================= DIVIDER ================= */

function Divider() {
  return (
    <div
      aria-hidden="true"
      className="hidden h-3 w-px bg-zinc-800 sm:block"
    />
  );
}

/* ================= PREVIEW CARD ================= */

function PreviewCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      className="
        group/card
        rounded-xl
        border
        border-zinc-800
        bg-[#111113]
        p-4
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[#D4AF37]/20
        hover:bg-[#141416]
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-lg
          border
          border-[#D4AF37]/20
          bg-[#D4AF37]/[0.08]
          text-[#D4AF37]
          transition-transform
          duration-300
          group-hover/card:scale-110
        "
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold text-white">
        {title}
      </p>

      <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">
        {text}
      </p>
    </div>
  );
}