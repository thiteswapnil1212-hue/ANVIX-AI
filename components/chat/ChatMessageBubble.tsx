
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { Components } from "react-markdown";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  GitFork,
  Globe,
  Image as ImageIcon,
  Scale,
  PanelTop,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { GroundingSource } from "@/lib/gemini/grounding";
import type { GeneratedImage } from "@/lib/image-client";
import GeneratedImageView from "./GeneratedImageView";
import ListenButton from "./ListenButton";
import ComparePanel from "./ComparePanel";
import {
  parseArtifacts,
  type ChatArtifact,
} from "@/lib/artifacts";

// Lazy (perf): the markdown renderer is loaded without ssr: false,
// so the server still renders the content into the first HTML and
// only the library's JS moves to a separate chunk. The skeleton
// covers the rare case the chunk arrives late on the client.
const MarkdownContent = dynamic(() => import("./MarkdownContent"), {
  loading: () => (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-3 h-4 w-3/4 rounded bg-white/[0.06]" />
      <div className="mb-3 h-4 w-full rounded bg-white/[0.06]" />
      <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
    </div>
  ),
});

interface ChatMessageBubbleProps {
  role: "assistant" | "user";
  content: string;
  /** Thought-summary text streamed alongside the answer (assistant only). */
  thinking?: string;
  /** Grounded web sources for this answer (assistant only). */
  sources?: GroundingSource[];
  /** Files the user attached to this message (user only). */
  attachments?: { name: string; mimeType: string }[];
  /** Branch/fork the chat at this message. Omit to hide the button. */
  onFork?: () => void;
  /** A Pollinations image generated for this message (assistant only). */
  generatedImage?: GeneratedImage;
  /** The user prompt this answer replies to (assistant only). */
  comparePrompt?: string;
  /** Open an artifact in the side panel (assistant only). */
  onOpenArtifact?: (artifact: ChatArtifact) => void;
  /** True while this assistant message is still streaming in. */
  isStreaming?: boolean;
}

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="
          flex w-full items-center gap-2 px-3 py-2
          text-left text-xs font-medium text-zinc-400
          transition-colors hover:text-zinc-200
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
        "
      >
        <ChevronDown
          className={`
            h-3.5 w-3.5 shrink-0 text-zinc-500
            transition-transform duration-150
            ${open ? "" : "-rotate-90"}
          `}
          aria-hidden="true"
        />
        <Sparkles
          className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]"
          aria-hidden="true"
        />
        Thinking
      </button>

      {open && (
        <p className="whitespace-pre-wrap border-t border-white/[0.06] px-3 py-2.5 text-[13px] leading-6 text-zinc-400">
          {thinking}
        </p>
      )}
    </div>
  );
}

function SourcesList({ sources }: { sources: GroundingSource[] }) {
  return (
    <div className="mt-4 border-t border-white/[0.06] pt-3">
      <div className="mb-2 flex items-center gap-2">
        {/* Shown only when sources actually arrived with the answer:
            grounding degrades silently on quota, so this badge never
            appears for an ungrounded reply. */}
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
          <Globe className="h-3 w-3" aria-hidden="true" />
          Grounded
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">
          Sources
        </p>
      </div>
      <ol className="space-y-1.5">
        {sources.map((source, index) => (
          <li key={`${source.uri}-${index}`} className="min-w-0">
            <a
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group/source flex items-start gap-1.5
                text-[13px] leading-5 text-zinc-400
                transition-colors hover:text-[#E9C96B]
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
              "
            >
              <span className="shrink-0 font-medium tabular-nums text-zinc-500">
                {index + 1}.
              </span>
              <span className="min-w-0 truncate underline underline-offset-4">
                {source.title}
              </span>
              <ExternalLink
                className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600 group-hover/source:text-[#D4AF37]"
                aria-hidden="true"
              />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AttachmentChips({
  attachments,
}: {
  attachments: { name: string; mimeType: string }[];
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        <span
          key={attachment.name}
          className="
            inline-flex max-w-full items-center gap-1.5
            rounded-lg border border-white/10
            bg-white/[0.05] px-2 py-1
            text-[11px] font-medium text-zinc-300
          "
        >
          {attachment.mimeType === "application/pdf" ? (
            <FileText
              className="h-3 w-3 shrink-0 text-zinc-400"
              aria-hidden="true"
            />
          ) : (
            <ImageIcon
              className="h-3 w-3 shrink-0 text-zinc-400"
              aria-hidden="true"
            />
          )}
          <span className="truncate">{attachment.name}</span>
        </span>
      ))}
    </div>
  );
}

function ArtifactCard({
  artifact,
  onOpen,
}: {
  artifact: ChatArtifact;
  onOpen: (artifact: ChatArtifact) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(artifact)}
      className="
        mt-4 flex w-full items-center gap-3
        rounded-xl border border-[#D4AF37]/30
        bg-[#D4AF37]/[0.06] px-3 py-2.5 text-left
        transition-colors hover:border-[#D4AF37]/50
        hover:bg-[#D4AF37]/[0.10]
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60
      "
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10">
        <PanelTop
          className="h-4 w-4 text-[#D4AF37]"
          aria-hidden="true"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-zinc-100">
          {artifact.title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-zinc-500">
          Interactive artifact · HTML · sandboxed, no network — tap to
          open
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-[#D4AF37] px-2 py-1 text-[11px] font-semibold text-black">
        Open
      </span>
    </button>
  );
}

function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimeoutRef, [clearTimeoutRef]);

  const handleCopy = useCallback(async () => {
    clearTimeoutRef();
    setStatus("idle");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }

    timeoutRef.current = setTimeout(() => {
      setStatus("idle");
      timeoutRef.current = null;
    }, 1800);
  }, [text, clearTimeoutRef]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={
        status === "copied"
          ? `${label} copied`
          : status === "error"
            ? `${label} failed`
            : label
      }
      title={
        status === "copied"
          ? "Copied!"
          : status === "error"
            ? "Copy failed"
            : label
      }
      className={`
        inline-flex min-h-8 items-center justify-center gap-1.5
        rounded-lg border border-white/10 bg-white/[0.04]
        px-2.5 text-xs font-medium text-zinc-400
        transition-colors hover:border-[#D4AF37]/30
        hover:bg-[#D4AF37]/[0.08] hover:text-[#E9C96B]
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#D4AF37]/60
        ${className}
      `}
    >
      {status === "copied" ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy
          className={`h-3.5 w-3.5 ${
            status === "error" ? "text-red-400" : ""
          }`}
        />
      )}
      <span>
        {status === "copied"
          ? "Copied"
          : status === "error"
            ? "Failed"
            : label}
      </span>
    </button>
  );
}

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => {
    const safeHref =
      href &&
      /^(https?:|mailto:|\/|#)/i.test(href) &&
      !/^\/\//.test(href)
        ? href
        : undefined;

    return (
      <a
        {...props}
        href={safeHref}
        target={safeHref?.startsWith("http") ? "_blank" : undefined}
        rel={safeHref?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="
          break-words text-[#D4AF37] underline
          underline-offset-4 transition-colors
          hover:text-yellow-300
        "
      >
        {children}
      </a>
    );
  },

  pre: ({ children, ...props }) => {
    const codeChild = Array.isArray(children)
      ? children.find(
          (child) =>
            child &&
            typeof child === "object" &&
            "props" in child &&
            (child as { props?: { children?: unknown } }).props
        )
      : children;

    const codeProps =
      codeChild &&
      typeof codeChild === "object" &&
      "props" in codeChild
        ? (codeChild as {
            props?: {
              children?: unknown;
              className?: string;
            };
          }).props
        : undefined;

    const codeText =
      typeof codeProps?.children === "string"
        ? codeProps.children
        : Array.isArray(codeProps?.children)
          ? codeProps.children.join("")
          : "";

    const language =
      codeProps?.className?.match(/language-([\w+-]+)/)?.[1];

    return (
      <div className="my-4 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#09090B]">
        <div className="
          flex min-h-10 items-center justify-between gap-3
          border-b border-white/[0.07] bg-white/[0.025]
          px-3 py-2
        ">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {language || "Code"}
          </span>
          <CopyButton
            text={codeText}
            label="Copy code"
            className="min-h-7 shrink-0 px-2"
          />
        </div>

        <pre
          {...props}
          className="
            m-0 max-w-full overflow-x-auto p-4
            text-[13px] leading-6 text-zinc-200
            [tab-size:2]
          "
        >
          {children}
        </pre>
      </div>
    );
  },

  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));

    return (
      <code
        {...props}
        className={
          isBlock
            ? `font-mono ${className || ""}`
            : `
              rounded-md border border-white/[0.06]
              bg-white/[0.07] px-1.5 py-0.5
              font-mono text-[0.9em] text-[#E9C96B]
              ${className || ""}
            `
        }
      >
        {children}
      </code>
    );
  },

  table: ({ children, ...props }) => (
    <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-white/10">
      <table
        {...props}
        className="w-full min-w-max border-collapse text-left text-sm"
      >
        {children}
      </table>
    </div>
  ),

  th: ({ children, ...props }) => (
    <th
      {...props}
      className="
        border-b border-white/10 bg-white/[0.04]
        px-3 py-2.5 text-left font-semibold text-zinc-100
      "
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td
      {...props}
      className="border-b border-white/[0.06] px-3 py-2.5 text-zinc-300"
    >
      {children}
    </td>
  ),

  img: ({ alt }) => (
    <span className="text-xs text-zinc-500">
      [Image{alt ? `: ${alt}` : ""}]
    </span>
  ),
};

function ChatMessageBubble({
  role,
  content,
  thinking,
  sources,
  attachments,
  onFork,
  generatedImage,
  comparePrompt,
  onOpenArtifact,
  isStreaming = false,
}: ChatMessageBubbleProps) {
  const isAssistant = role === "assistant";
  const [compareOpen, setCompareOpen] = useState(false);

  // Artifact blocks are extracted from assistant text so the raw
  // fence never renders as code — the card below opens the panel.
  // When no panel handler is wired up, the raw text is kept verbatim
  // instead: extracting without a card would hide the code.
  const { text: displayText, artifacts } = useMemo(
    () =>
      isAssistant && onOpenArtifact
        ? parseArtifacts(content)
        : { text: content, artifacts: [] as ChatArtifact[] },
    [content, isAssistant, onOpenArtifact]
  );

  const isEmptyAssistant =
    isAssistant &&
    !displayText.trim() &&
    !thinking?.trim() &&
    !generatedImage &&
    artifacts.length === 0;

  if (isEmptyAssistant) return null;

  return (
    <article
      aria-label={isAssistant ? "Assistant message" : "Your message"}
      className={`
        group/message flex w-full items-start gap-2.5
        sm:gap-3
        ${isAssistant ? "justify-start" : "justify-end"}
      `}
    >
      {isAssistant && (
        <div
          className="
            mt-1 flex h-8 w-8 shrink-0 items-center
            justify-center rounded-xl border
            border-[#D4AF37]/25
            bg-gradient-to-br from-[#D4AF37]/[0.13]
            to-[#D4AF37]/[0.03]
            shadow-[0_0_18px_rgba(212,175,55,0.06)]
          "
          title="ANVIX AI"
        >
          <Sparkles
            className="h-4 w-4 text-[#D4AF37]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={`
          relative min-w-0
          ${
            isAssistant
              ? "max-w-[calc(100%-2.75rem)] sm:max-w-[82%]"
              : "max-w-[calc(100%-2.75rem)] sm:max-w-[76%]"
          }
        `}
      >
        {isAssistant && (
          <div className="mb-2 flex min-h-4 items-center gap-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#D4AF37]">
              ANVIX AI
            </span>
            <span
              className="h-1 w-1 rounded-full bg-zinc-700"
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium text-zinc-500">
              Assistant
            </span>
          </div>
        )}

        <div
          className={`
            relative min-w-0 rounded-2xl border
            px-4 py-3 transition-colors duration-200
            sm:px-5 sm:py-4
            ${
              isAssistant
                ? `
                  rounded-tl-md border-white/[0.07]
                  bg-[#151518]/95 text-zinc-200
                  shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                  hover:border-white/[0.12]
                `
                : `
                  rounded-tr-md border-[#D4AF37]/20
                  bg-gradient-to-br from-[#302E25]
                  to-[#24231F] text-zinc-100
                  shadow-[0_8px_30px_rgba(0,0,0,0.10)]
                  hover:border-[#D4AF37]/35
                `
            }
          `}
        >
          <div
            className={`
              min-w-0 break-words [overflow-wrap:anywhere]
              text-[14px] leading-[1.8] sm:text-[15px]
              ${
                isAssistant
                  ? "selection:bg-[#D4AF37]/25"
                  : "whitespace-pre-wrap selection:bg-zinc-500/30"
              }
            `}
          >
            {isAssistant && thinking?.trim() ? (
              <ThinkingBlock thinking={thinking} />
            ) : null}

            {isAssistant && generatedImage ? (
              <GeneratedImageView image={generatedImage} />
            ) : null}

            {!isAssistant && attachments && attachments.length > 0 ? (
              <AttachmentChips attachments={attachments} />
            ) : null}

            {isAssistant ? (
              isStreaming ? (
                // Plain text while streaming: re-parsing the whole
                // growing markdown on every chunk is quadratic work.
                // Full markdown renders once when the answer completes.
                <p className="whitespace-pre-wrap">{content}</p>
              ) : (
              <MarkdownContent
                content={displayText}
                components={markdownComponents}
              />
              )
            ) : (
              content
            )}
          </div>

          {isAssistant && artifacts.length > 0 && onOpenArtifact ? (
            <div className="mt-1">
              {artifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onOpen={onOpenArtifact}
                />
              ))}
            </div>
          ) : null}

          {isAssistant && sources && sources.length > 0 ? (
            <SourcesList sources={sources} />
          ) : null}

          {/* The action row is invisible until hover on desktop
              (opacity-0), but it still reserved ~44px of bubble
              height — a one-word message rendered ~110px tall. The
              wrapper collapses that space on desktop until the
              message is hovered or focused; on touch screens the row
              stays visible. */}
          <div className="max-h-12 overflow-hidden transition-all duration-200 sm:max-h-0 sm:group-hover/message:max-h-12 sm:group-focus-within/message:max-h-12">
            <div
              className={`
                mt-3 flex gap-2
                ${isAssistant ? "justify-end" : "justify-start"}
              `}
            >
            {onFork && (
              <button
                type="button"
                onClick={onFork}
                aria-label="Branch chat from this message"
                title="Branch chat from here — copies this chat up to this message into a new chat"
                className="
                  inline-flex min-h-8 items-center justify-center gap-1.5
                  rounded-lg border border-white/10 bg-white/[0.04]
                  px-2.5 text-xs font-medium text-zinc-400
                  transition-colors hover:border-[#D4AF37]/30
                  hover:bg-[#D4AF37]/[0.08] hover:text-[#E9C96B]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[#D4AF37]/60
                  opacity-100 sm:opacity-0
                  sm:group-hover/message:opacity-100
                  sm:group-focus-within/message:opacity-100
                "
              >
                <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Branch</span>
              </button>
            )}
            {isAssistant && content.trim() ? (
              <ListenButton text={content} />
            ) : null}
            {isAssistant && comparePrompt?.trim() ? (
              <button
                type="button"
                onClick={() => setCompareOpen((open) => !open)}
                aria-expanded={compareOpen}
                aria-label="Compare with a second model"
                title="Compare with a second model (your own OpenRouter key)"
                className="
                  inline-flex min-h-8 items-center justify-center gap-1.5
                  rounded-lg border border-white/10 bg-white/[0.04]
                  px-2.5 text-xs font-medium text-zinc-400
                  transition-colors hover:border-[#D4AF37]/30
                  hover:bg-[#D4AF37]/[0.08] hover:text-[#E9C96B]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[#D4AF37]/60
                "
              >
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Compare</span>
              </button>
            ) : null}
            <CopyButton
              text={content}
              label="Copy message"
              className="
                opacity-100 sm:opacity-0
                sm:group-hover/message:opacity-100
                sm:group-focus-within/message:opacity-100
              "
            />
            </div>
          </div>

          {isAssistant && compareOpen && comparePrompt?.trim() ? (
            <ComparePanel prompt={comparePrompt} />
          ) : null}
        </div>
      </div>

      {!isAssistant && (
        <div
          className="
            mt-1 flex h-8 w-8 shrink-0 items-center
            justify-center rounded-xl border
            border-white/[0.10] bg-[#202023] text-zinc-400
          "
          title="You"
        >
          <UserRound
            className="h-4 w-4"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </div>
      )}
    </article>
  );
}

export default memo(ChatMessageBubble);