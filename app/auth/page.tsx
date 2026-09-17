
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "../favicon.png";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
  CheckCircle2,
  Zap,
  BrainCircuit,
} from "lucide-react";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setShowPassword(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isSignup && name.trim().length < 2) {
      setMessage("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (isSignup && !acceptedTerms) {
      setMessage("Please accept the terms to continue.");
      return;
    }

    // Connect Supabase Auth here later.
    // Do not claim authentication succeeded before backend confirmation.
    setMessage(
      "Authentication is not connected yet. Please try again after setup."
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-[#c9a44c]/[0.08] blur-[130px]" />
        <div className="absolute -bottom-48 -right-40 h-[500px] w-[500px] rounded-full bg-[#c9a44c]/[0.06] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#080808_75%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex h-20 items-center justify-between px-5 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="group inline-flex items-center gap-3"
          aria-label="ANVIX AI home"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#c9a44c]/30 bg-[#c9a44c]/10">
            <Image
              src={logo}
              alt="ANVIX AI logo"
              fill
              priority
              sizes="40px"
              className="object-contain p-1"
            />
          </span>

          <span className="text-lg font-semibold tracking-[0.16em]">
            ANVIX<span className="text-[#d4b35e]"> AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/pricing"
            className="text-sm font-medium text-[#d4b35e] transition hover:text-[#f0d98d]"
          >
            Pricing
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <section className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pb-12 pt-4 sm:px-6">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.09] bg-[#101010]/90 shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1fr_0.95fr]">

          {/* Left panel */}
          <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.08] bg-[#0d0d0d] p-10 lg:flex xl:p-12">
            <div
              aria-hidden="true"
              className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-[#d4b35e]/10"
            />
            <div
              aria-hidden="true"
              className="absolute -right-12 top-32 h-48 w-48 rounded-full border border-[#d4b35e]/10"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-20 left-10 h-64 w-64 rounded-full bg-[#c9a44c]/[0.06] blur-[90px]"
            />

            <div className="relative">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#d4b35e]/20 bg-[#d4b35e]/[0.07] px-3 py-1.5 text-xs text-[#dfc477]">
                <Sparkles size={14} />
                Your AI workspace
              </div>

              <h1 className="max-w-md text-4xl font-semibold leading-[1.2] tracking-tight xl:text-5xl">
                Think bigger.
                <br />
                Build with
                <br />
                <span className="bg-gradient-to-r from-[#f2df9c] via-[#d4b35e] to-[#a88330] bg-clip-text text-transparent">
                  intelligence.
                </span>
              </h1>

              <p className="mt-6 max-w-sm text-sm leading-7 text-white/45">
                Explore AI models, work on ideas, and bring your projects
                together in one thoughtfully designed workspace.
              </p>

              {/* AI Models */}
              <div className="mt-8 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Explore our AI models
                </p>

                {/* Guest model */}
                <div className="rounded-xl border border-[#d4b35e]/20 bg-[#d4b35e]/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-[#dfc477]" />
                      <span className="text-sm font-medium text-white">
                        Gemini 2.5 Flash
                      </span>
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                      Guest access
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Start chatting without creating an account.
                  </p>
                </div>

                {/* Other models */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BrainCircuit
                        size={16}
                        className="text-[#d4b35e]"
                      />
                      <span className="text-sm font-medium text-white">
                        More AI models
                      </span>
                    </div>

                    <LockKeyhole
                      size={15}
                      className="text-[#d4b35e]"
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Sign up to access other models available in the
                    ANVIX AI model selector.
                  </p>
                </div>

                <Link
                  href="/pricing"
                  className="group inline-flex items-center gap-2 pt-1 text-sm font-medium text-[#d4b35e] transition hover:text-[#f0d98d]"
                >
                  Explore plans and pricing
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>

            {/* Workspace card */}
            <div className="relative mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4b35e]/10 text-[#dfc477]">
                  <LockKeyhole size={19} />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Your workspace, your way
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Sign in to access your account.
                  </p>
                </div>
              </div>
            </div>

            <p className="relative mt-8 text-xs text-white/25">
              © {new Date().getFullYear()} ANVIX AI
            </p>
          </aside>

          {/* Right panel */}
          <div className="flex items-center justify-center p-5 sm:p-9 lg:p-10 xl:p-12">
            <div className="w-full max-w-md">

              {/* Mobile brand */}
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={logo}
                    alt="ANVIX AI logo"
                    fill
                    priority
                    sizes="36px"
                    className="object-contain"
                  />
                </span>

                <span className="text-sm font-semibold tracking-[0.16em]">
                  ANVIX AI
                </span>
              </div>

              <div className="mb-8">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#d4b35e]">
                  {isSignup ? "Get started" : "Welcome back"}
                </p>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {isSignup ? "Create your account" : "Sign in to ANVIX"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-white/45">
                  {isSignup
                    ? "Create an account to explore your AI workspace."
                    : "Enter your details to continue to your workspace."}
                </p>
              </div>

              {/* Mode selector */}
              <div className="mb-7 grid grid-cols-2 rounded-xl border border-white/[0.07] bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={`rounded-lg py-2.5 text-sm font-medium transition ${
                    !isSignup
                      ? "bg-[#d4b35e] text-black shadow-lg shadow-[#d4b35e]/10"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`rounded-lg py-2.5 text-sm font-medium transition ${
                    isSignup
                      ? "bg-[#d4b35e] text-black shadow-lg shadow-[#d4b35e]/10"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignup && (
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-medium text-white/75"
                    >
                      Full name
                    </label>

                    <div className="relative">
                      <UserRound
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                      />

                      <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d4b35e]/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#d4b35e]/10"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-white/75"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d4b35e]/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#d4b35e]/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-white/75"
                    >
                      Password
                    </label>

                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() =>
                          setMessage(
                            "Password reset will be available after Supabase Auth is connected."
                          )
                        }
                        className="text-xs text-[#d4b35e] transition hover:text-[#f0d98d]"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        isSignup ? "new-password" : "current-password"
                      }
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d4b35e]/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#d4b35e]/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/5 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>

                  {isSignup && (
                    <p className="mt-2 text-xs text-white/35">
                      Use at least 8 characters.
                    </p>
                  )}
                </div>

                {isSignup && (
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/45">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) =>
                        setAcceptedTerms(e.target.checked)
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-[#d4b35e]"
                    />

                    <span>
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="text-[#d4b35e] hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-[#d4b35e] hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                )}

                {message && (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm leading-5 text-amber-200/90"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4b35e] to-[#c6a34a] text-sm font-semibold text-black shadow-lg shadow-[#c9a44c]/10 transition hover:brightness-110 active:scale-[0.99]"
                >
                  {isSignup ? "Create account" : "Sign in"}

                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              </form>

              {/* Account switch */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-xs text-white/25">OR</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <p className="text-center text-sm text-white/45">
                {isSignup
                  ? "Already have an account?"
                  : "New to ANVIX AI?"}{" "}

                <button
                  type="button"
                  onClick={() =>
                    switchMode(isSignup ? "signin" : "signup")
                  }
                  className="font-medium text-[#d4b35e] transition hover:text-[#f0d98d]"
                >
                  {isSignup ? "Sign in" : "Create an account"}
                </button>
              </p>

              {/* Pricing CTA */}
              <div className="mt-5 text-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-[#d4b35e]"
                >
                  View ANVIX AI plans
                  <ArrowRight size={15} />
                </Link>
              </div>

              {/* Secure access */}
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/25">
                <CheckCircle2 size={14} />
                <span>Secure account access</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}