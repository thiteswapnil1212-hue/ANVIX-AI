"use client";

import {
  Check,
  ChevronDown,
  Code2,
  Layers3,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export type BuildMode = "prototype" | "production" | "enterprise";
export type AppType = "web-app" | "dashboard" | "saas" | "landing-page";

export interface BuildOptions {
  mode: BuildMode;
  appType: AppType;
}

interface BuildOptionProps {
  value: BuildOptions;
  onChange: (options: BuildOptions) => void;
  disabled?: boolean;
}

const buildModes: {
  id: BuildMode;
  label: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    id: "prototype",
    label: "Prototype",
    description: "Fast exploration and validation",
    icon: Sparkles,
  },
  {
    id: "production",
    label: "Production",
    description: "Scalable and deployment-ready",
    icon: Rocket,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Advanced architecture and controls",
    icon: Layers3,
  },
];

const appTypes: {
  id: AppType;
  label: string;
}[] = [
  {
    id: "web-app",
    label: "Web App",
  },
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "saas",
    label: "SaaS",
  },
  {
    id: "landing-page",
    label: "Landing Page",
  },
];

export default function BuildOption({
  value,
  onChange,
  disabled = false,
}: BuildOptionProps) {
  const [modeOpen, setModeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const selectedMode =
    buildModes.find((mode) => mode.id === value.mode) ??
    buildModes[1];

  const selectedType =
    appTypes.find((type) => type.id === value.appType) ??
    appTypes[0];

  function updateMode(mode: BuildMode) {
    onChange({
      ...value,
      mode,
    });

    setModeOpen(false);
  }

  function updateAppType(appType: AppType) {
    onChange({
      ...value,
      appType,
    });

    setTypeOpen(false);
  }

  return (
    <section
      aria-labelledby="build-options-title"
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-zinc-800/80
        bg-[#111113]
        p-5
        shadow-[0_20px_60px_rgba(0,0,0,0.14)]
        sm:p-6
      "
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-24
          -top-24
          h-52
          w-52
          rounded-full
          bg-[#D4AF37]/[0.035]
          blur-[80px]
        "
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-zinc-800
              bg-[#0D0D0F]
            "
          >
            <Code2
              className="h-4.5 w-4.5 text-[#D4AF37]"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2
              id="build-options-title"
              className="text-sm font-semibold text-white"
            >
              Build options
            </h2>

            <p className="mt-1 text-xs leading-5 text-zinc-600">
              Configure how ANVIX should approach your build.
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Build mode */}
          <div className="relative">
            <label
              htmlFor="build-mode"
              className="
                mb-2
                block
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-zinc-600
              "
            >
              Build mode
            </label>

            <button
              id="build-mode"
              type="button"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={modeOpen}
              onClick={() => {
                setModeOpen((open) => !open);
                setTypeOpen(false);
              }}
              className="
                flex
                w-full
                items-center
                justify-between
                gap-3
                rounded-xl
                border
                border-zinc-800
                bg-[#0D0D0F]
                px-4
                py-3
                text-left
                transition-all
                duration-200
                hover:border-zinc-700
                hover:bg-[#101012]
                focus:outline-none
                focus:ring-2
                focus:ring-[#D4AF37]/20
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#D4AF37]/[0.07]
                  "
                >
                  <selectedMode.icon
                    className="h-3.5 w-3.5 text-[#D4AF37]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-200">
                    {selectedMode.label}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                    {selectedMode.description}
                  </p>
                </div>
              </div>

              <ChevronDown
                className={`
                  h-4
                  w-4
                  shrink-0
                  text-zinc-600
                  transition-transform
                  duration-200
                  ${modeOpen ? "rotate-180" : ""}
                `}
                aria-hidden="true"
              />
            </button>

            {modeOpen && (
              <div
                role="listbox"
                aria-label="Build mode"
                className="
                  absolute
                  left-0
                  right-0
                  top-full
                  z-30
                  mt-2
                  overflow-hidden
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#101012]
                  p-1.5
                  shadow-[0_20px_45px_rgba(0,0,0,0.45)]
                "
              >
                {buildModes.map((mode) => {
                  const Icon = mode.icon;
                  const selected = mode.id === value.mode;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => updateMode(mode.id)}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-lg
                        px-3
                        py-2.5
                        text-left
                        transition-colors
                        duration-150
                        hover:bg-[#18181A]
                      "
                    >
                      <div
                        className={`
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          ${
                            selected
                              ? "bg-[#D4AF37]/10"
                              : "bg-zinc-900"
                          }
                        `}
                      >
                        <Icon
                          className={`
                            h-3.5
                            w-3.5
                            ${
                              selected
                                ? "text-[#D4AF37]"
                                : "text-zinc-500"
                            }
                          `}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`
                            text-xs
                            font-medium
                            ${
                              selected
                                ? "text-white"
                                : "text-zinc-300"
                            }
                          `}
                        >
                          {mode.label}
                        </p>

                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          {mode.description}
                        </p>
                      </div>

                      {selected && (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* App type */}
          <div className="relative">
            <label
              htmlFor="app-type"
              className="
                mb-2
                block
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-zinc-600
              "
            >
              Project type
            </label>

            <button
              id="app-type"
              type="button"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={typeOpen}
              onClick={() => {
                setTypeOpen((open) => !open);
                setModeOpen(false);
              }}
              className="
                flex
                w-full
                items-center
                justify-between
                gap-3
                rounded-xl
                border
                border-zinc-800
                bg-[#0D0D0F]
                px-4
                py-3
                text-left
                transition-all
                duration-200
                hover:border-zinc-700
                hover:bg-[#101012]
                focus:outline-none
                focus:ring-2
                focus:ring-[#D4AF37]/20
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-zinc-900
                  "
                >
                  <Layers3
                    className="h-3.5 w-3.5 text-zinc-400"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-200">
                    {selectedType.label}
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    Select your starting architecture
                  </p>
                </div>
              </div>

              <ChevronDown
                className={`
                  h-4
                  w-4
                  shrink-0
                  text-zinc-600
                  transition-transform
                  duration-200
                  ${typeOpen ? "rotate-180" : ""}
                `}
                aria-hidden="true"
              />
            </button>

            {typeOpen && (
              <div
                role="listbox"
                aria-label="Project type"
                className="
                  absolute
                  left-0
                  right-0
                  top-full
                  z-30
                  mt-2
                  overflow-hidden
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#101012]
                  p-1.5
                  shadow-[0_20px_45px_rgba(0,0,0,0.45)]
                "
              >
                {appTypes.map((type) => {
                  const selected = type.id === value.appType;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => updateAppType(type.id)}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-lg
                        px-3
                        py-3
                        text-left
                        transition-colors
                        duration-150
                        hover:bg-[#18181A]
                      "
                    >
                      <div
                        className={`
                          flex
                          h-7
                          w-7
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          ${
                            selected
                              ? "bg-[#D4AF37]/10"
                              : "bg-zinc-900"
                          }
                        `}
                      >
                        <span
                          className={`
                            h-1.5
                            w-1.5
                            rounded-full
                            ${
                              selected
                                ? "bg-[#D4AF37]"
                                : "bg-zinc-700"
                            }
                          `}
                        />
                      </div>

                      <span
                        className={`
                          flex-1
                          text-xs
                          font-medium
                          ${
                            selected
                              ? "text-white"
                              : "text-zinc-300"
                          }
                        `}
                      >
                        {type.label}
                      </span>

                      {selected && (
                        <Check
                          className="h-3.5 w-3.5 text-[#D4AF37]"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Current configuration */}
        <div
          className="
            mt-5
            flex
            flex-wrap
            items-center
            gap-2
            border-t
            border-zinc-800/70
            pt-4
          "
        >
          <span className="text-[10px] text-zinc-700">
            Configuration:
          </span>

          <span
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              border-zinc-800
              bg-[#0D0D0F]
              px-2.5
              py-1
              text-[10px]
              text-zinc-500
            "
          >
            <Sparkles className="h-2.5 w-2.5 text-[#D4AF37]" />
            {selectedMode.label}
          </span>

          <span
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              border-zinc-800
              bg-[#0D0D0F]
              px-2.5
              py-1
              text-[10px]
              text-zinc-500
            "
          >
            <Layers3 className="h-2.5 w-2.5 text-zinc-500" />
            {selectedType.label}
          </span>
        </div>
      </div>
    </section>
  );
}