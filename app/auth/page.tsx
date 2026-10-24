
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

type AuthMode = "signin" | "signup";

const NOT_CONFIGURED_MESSAGE =
  "Authentication is not connected on this deployment yet — the Supabase environment variables are missing, so accounts are unavailable. Guest mode still works everywhere else.";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/chat");
    }
  }, [authLoading, user, router]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setShowPassword(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    if (!supabase) {
      setMessage(NOT_CONFIGURED_MESSAGE);
      return;
    }

    setSubmitting(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data.session) {
          setMessage(
            "Account created — check your email to confirm it, then sign in."
          );
          setMode("signin");
          return;
        }

        router.push("/chat");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push("/chat");
    } catch {
      setMessage("Something went wrong while contacting the auth service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage("");

    if (!supabase) {
      setMessage(NOT_CONFIGURED_MESSAGE);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/chat` },
    });

    if (error) {
      setMessage(error.message);
    }
  }

  async function handleForgotPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email above first, then tap Forgot password.");
      return;
    }

    if (!supabase) {
      setMessage(NOT_CONFIGURED_MESSAGE);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "If an account exists for that email, a password reset link is on its way."
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

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm font-medium text-white transition hover:border-white/[0.2] hover:bg-white/[0.06] active:scale-[0.99]"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.58v2.97h3.87c2.26-2.09 3.57-5.16 3.57-8.74z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-2.97c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.06A11.99 11.99 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.31A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.58.38-2.31V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.06z" />
                  <path fill="#EA4335" d="M12 4.74c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.06C6.22 6.85 8.87 4.74 12 4.74z" />
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-xs text-white/25">OR</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
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
                        onClick={handleForgotPassword}
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
                  disabled={submitting}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4b35e] to-[#c6a34a] text-sm font-semibold text-black shadow-lg shadow-[#c9a44c]/10 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                >
                  {submitting
                    ? "Please wait…"
                    : isSignup
                      ? "Create account"
                      : "Sign in"}

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