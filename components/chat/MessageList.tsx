
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, ChevronUp, Sparkles } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { GroundingSource } from "@/lib/gemini/grounding";
import type { GeneratedImage } from "@/lib/image-client";
import type { ChatArtifact } from "@/lib/artifacts";
import { newMessagesLabel } from "@/lib/chat/format-count";
import { addedMessageScrollTarget, bottomSpacerPx } from "@/lib/chat/scroll-anchor";
import ChatMessageBubble from "./ChatMessageBubble";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt?: string | Date;
  status?: "sending" | "sent" | "error";
  /** Thought-summary text (assistant only; local display data). */
  thinking?: string;
  /** Grounded web sources (assistant only; local display data). */
  sources?: GroundingSource[];
  /** Files attached to this message (user only; local display data). */
  attachments?: { name: string; mimeType: string }[];
  /** A Pollinations image generated for this message (assistant only). */
  generatedImage?: GeneratedImage;
  /** The user prompt this answer replies to (assistant only). */
  comparePrompt?: string;
}

interface MessageListProps {
  messages?: Message[];
  isTyping?: boolean;
  /** Branch/fork the active chat at this message. Omit to hide. */
  onForkMessage?: (messageId: string) => void;
  /** Open an artifact from a message in the side panel. */
  onOpenArtifact?: (artifact: ChatArtifact) => void;
  hasEarlierMessages?: boolean;
  loadingEarlierMessages?: boolean;
  onLoadEarlierMessages?: () => void;
}

const BOTTOM_THRESHOLD = 120;

// Clearance for a top-anchored row: on desktop the conversation
// toolbar overlays the top of the message area (44px tall). The
// list's own top padding (48px from sm up) already puts an anchored
// row 48px below the list top, so only a small extra nudge is
// needed to clear the toolbar with a gap. Below md there is no
// overlaid toolbar, so no clearance is applied.
const TOP_ANCHOR_CLEARANCE_PX = 12;

const MessageRow = memo(function MessageRow({
  message,
  onForkMessage,
  onOpenArtifact,
  isStreaming = false,
}: {
  message: Message;
  onForkMessage?: (messageId: string) => void;
  onOpenArtifact?: (artifact: ChatArtifact) => void;
  isStreaming?: boolean;
}) {
  // No entrance animation: virtualized rows remount on scroll and
  // the animation would replay (flicker) every time.
  return (
    <div>
      <ChatMessageBubble
        role={message.role}
        content={message.content}
        thinking={message.thinking}
        sources={message.sources}
        attachments={message.attachments}
        onFork={
          onForkMessage
            ? () => onForkMessage(message.id)
            : undefined
        }
        generatedImage={message.generatedImage}
        comparePrompt={message.comparePrompt}
        onOpenArtifact={onOpenArtifact}
        isStreaming={isStreaming}
      />
    </div>
  );
});

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 sm:gap-3.5">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07] shadow-[0_0_20px_rgba(212,175,55,0.04)]">
        <Sparkles
          className="h-4 w-4 text-[#D4AF37]"
          strokeWidth={1.8}
          aria-hidden="true"
        />

        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#0B0B0C] bg-[#D4AF37]" />
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-xs font-medium text-zinc-500">
          ANVIX AI
        </p>

        <div
          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/[0.07] bg-[#151518] px-4 py-3"
          role="status"
          aria-label="ANVIX AI is thinking"
        >
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D4AF37]" />
        </div>
      </div>
    </div>
  );
}

export default function MessageList({
  messages = [],
  isTyping = false,
  onForkMessage,
  onOpenArtifact,
  hasEarlierMessages = false,
  loadingEarlierMessages = false,
  onLoadEarlierMessages,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const autoScrollRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  // A programmatic scroll (auto-scroll / streaming pin) fires scroll
  // events at intermediate positions while it animates; without this
  // guard those events flip auto-scroll off and pop the jump pill
  // even though the reader never scrolled away.
  const programmaticScrollUntilRef = useRef(0);
  const previousCountRef = useRef(messages.length);
  const previousLastIdRef = useRef(
    messages[messages.length - 1]?.id ?? ""
  );
  const previousTypingRef = useRef(isTyping);
  const previousFirstIdRef = useRef(messages[0]?.id ?? "");
  // Scroll anchor recorded when "load earlier messages" is clicked:
  // the layout effect restores the viewport after the prepend so
  // the reader stays on the same message instead of jumping.
  const prependAnchorRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const firstRenderRef = useRef(true);
  // Set when the layout effect top-anchors a just-sent prompt: the
  // streaming pin effect skips exactly one run (the send commit) so
  // it cannot yank the view to the bottom before the anchor scroll
  // runs. Pinning resumes on the next streamed chunk.
  const skipStreamingPinOnceRef = useRef(false);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Scrollable room below the last row, fed to the virtualizer as
  // paddingEnd (see bottomSpacerPx): without it a just-sent prompt
  // cannot top-anchor, because scrollToIndex(align: "start")
  // clamps to scrollHeight - clientHeight and the tail below the
  // prompt is far shorter than the viewport. Measured from the
  // container itself so it tracks resizes and composer-height
  // changes; the ref mirror is what isNearBottom reads, so the
  // "bottom" stays the last row, not the end of the spacer.
  const [bottomSpacerPxState, setBottomSpacerPxState] = useState(0);
  const bottomSpacerPxRef = useRef(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateSpacer = () => {
      const next = bottomSpacerPx(container.clientHeight);
      if (next !== bottomSpacerPxRef.current) {
        bottomSpacerPxRef.current = next;
        setBottomSpacerPxState(next);
      }
    };

    updateSpacer();
    const observer = new ResizeObserver(updateSpacer);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const latestMessage = messages[messages.length - 1];
  const firstMessageId = messages[0]?.id ?? "";
  const showingAssistant = latestMessage?.role === "assistant";

  const shouldShowTypingIndicator =
    isTyping &&
    (!showingAssistant || !latestMessage?.content?.trim());

  // Virtualized rows (perf): only the viewport + overscan are in the
  // DOM, so very long chats scroll smoothly instead of mounting
  // hundreds of markdown bubbles. Row heights are dynamic
  // (measureElement); the 28px inter-row gap rides inside each row
  // (pb-7) so it is part of the measured size. The typing indicator
  // is the last virtual row while it is shown, so scrolling to the
  // bottom always lands on it instead of cutting it off.
  // Trade-off: browser find-in-page (Ctrl+F) no longer finds
  // off-screen messages, because they are not in the DOM.
  const totalCount =
    messages.length + (shouldShowTypingIndicator ? 1 : 0);
  // useVirtualizer returns functions the React Compiler cannot
  // memoize safely, so it skips memoizing this component — that is
  // the intended behaviour for a virtualizer (it owns mutable
  // measurement state), not a defect.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 5,
    // Room below the last row for the top anchor (see the spacer
    // state above). The virtualizer's last-row "end" alignment
    // subtracts paddingEnd again, so scroll-to-bottom still lands
    // the last row at the viewport bottom.
    paddingEnd: bottomSpacerPxState,
  });

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) return true;

    // Distance to the last row, not to the end of the bottom
    // spacer: after scroll-to-bottom the last row sits at the
    // viewport bottom with only the 48px bottom padding below it.
    const distance =
      container.scrollHeight -
      bottomSpacerPxRef.current -
      container.scrollTop -
      container.clientHeight;

    return distance <= BOTTOM_THRESHOLD;
  }, []);

  const updateScrollButton = useCallback((visible: boolean) => {
    setShowScrollButton((current) =>
      current === visible ? current : visible
    );
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (totalCount === 0) return;

      programmaticScrollUntilRef.current = Date.now() + 800;
      rowVirtualizer.scrollToIndex(totalCount - 1, {
        align: "end",
        behavior,
      });

      autoScrollRef.current = true;
      updateScrollButton(false);
      setUnreadCount(0);
    },
    [updateScrollButton, rowVirtualizer, totalCount]
  );

  const scheduleScroll = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        scrollToBottom(behavior);
        frameRef.current = null;
      });
    },
    [scrollToBottom]
  );

  // Scroll a specific row into place (the top anchor). A "start"
  // anchor is instant, not smooth: the streaming pin takes over
  // within a chunk or two, so a smooth animation would be
  // interrupted mid-flight. The desktop toolbar overlays the top of
  // the message area, so an anchored row is nudged down past it.
  const scrollToRow = useCallback(
    (
      index: number,
      align: "start" | "end",
      behavior: ScrollBehavior = "auto"
    ) => {
      programmaticScrollUntilRef.current = Date.now() + 800;
      rowVirtualizer.scrollToIndex(index, { align, behavior });

      if (align === "start") {
        const container = scrollRef.current;

        if (
          container &&
          window.matchMedia("(min-width: 768px)").matches
        ) {
          container.scrollTop = Math.max(
            0,
            container.scrollTop - TOP_ANCHOR_CLEARANCE_PX
          );
        }
      }

      autoScrollRef.current = true;
      updateScrollButton(false);
      setUnreadCount(0);
    },
    [rowVirtualizer, updateScrollButton]
  );

  const scheduleScrollToRow = useCallback(
    (index: number, align: "start" | "end") => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        scrollToRow(index, align, "auto");
        frameRef.current = null;
      });
    },
    [scrollToRow]
  );

  const handleLoadEarlier = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      prependAnchorRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    }
    onLoadEarlierMessages?.();
  }, [onLoadEarlierMessages]);

  const handleScroll = useCallback(() => {
    // Ignore scroll events fired by our own programmatic scrolls
    // while they settle: mid-animation positions are not the reader
    // scrolling away from the bottom.
    if (Date.now() < programmaticScrollUntilRef.current) {
      autoScrollRef.current = true;
      updateScrollButton(false);
      setUnreadCount(0);
      return;
    }

    const nearBottom = isNearBottom();

    autoScrollRef.current = nearBottom;
    updateScrollButton(!nearBottom);

    if (nearBottom) {
      setUnreadCount(0);
    }
  }, [isNearBottom, updateScrollButton]);

  // Follow new messages and typing state, unless the reader
  // has intentionally scrolled away from the bottom.
  useLayoutEffect(() => {
    const previousCount = previousCountRef.current;
    const previousLastId = previousLastIdRef.current;
    const wasTyping = previousTypingRef.current;
    const previousFirstId = previousFirstIdRef.current;

    const newMessageAdded = messages.length > previousCount;
    const latestMessageChanged =
      (latestMessage?.id ?? "") !== previousLastId;
    const typingStarted = isTyping && !wasTyping;

    // Older messages prepended by "load earlier": keep the viewport
    // steady (scrollHeight grows by the prepended content) and do
    // not count them as unread new messages. The last message must
    // be unchanged — that distinguishes a prepend from switching to
    // another conversation (whose first id also changes).
    const anchor = prependAnchorRef.current;
    prependAnchorRef.current = null;
    const prepended =
      anchor !== null &&
      previousFirstId !== "" &&
      firstMessageId !== previousFirstId &&
      messages.length > previousCount &&
      (latestMessage?.id ?? "") === previousLastId;

    previousCountRef.current = messages.length;
    previousLastIdRef.current = latestMessage?.id ?? "";
    previousFirstIdRef.current = firstMessageId;
    previousTypingRef.current = isTyping;

    if (prepended && anchor) {
      const container = scrollRef.current;
      if (container) {
        container.scrollTop =
          anchor.scrollTop +
          (container.scrollHeight - anchor.scrollHeight);
      }
      return;
    }

    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      if (messages.length > 0 || isTyping) {
        scheduleScroll("auto");
      }

      return;
    }

    if (newMessageAdded || latestMessageChanged) {
      if (autoScrollRef.current) {
        // A batch starting with a user message is a send: anchor
        // the prompt to the top (ChatGPT-style) and let the reply
        // stream below it. Anything else keeps the old behaviour —
        // the last row pins to the bottom.
        const target = addedMessageScrollTarget({
          addedRoles: messages
            .slice(previousCount)
            .map((message) => message.role),
          addedStartIndex: previousCount,
          autoScroll: true,
        });

        if (target?.align === "start") {
          skipStreamingPinOnceRef.current = true;
          scheduleScrollToRow(target.index, "start");
        } else {
          scheduleScroll("smooth");
        }
      } else {
        setUnreadCount((count) => count + 1);
        updateScrollButton(true);
      }

      return;
    }

    if (typingStarted && autoScrollRef.current) {
      scheduleScroll("smooth");
    }
    // The deps are intentionally narrow (length + ids, not the
    // messages array): this effect must not re-run on every streamed
    // chunk — per-chunk following is the streaming pin effect's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages.length,
    latestMessage?.id,
    firstMessageId,
    isTyping,
    scheduleScroll,
    scheduleScrollToRow,
    updateScrollButton,
  ]);

  // A "load earlier" click that returned no older messages
  // leaves the anchor set with nothing to restore; clear it so a
  // later conversation switch cannot mistake it for a prepend.
  useEffect(() => {
    if (!hasEarlierMessages) {
      prependAnchorRef.current = null;
    }
  }, [hasEarlierMessages]);

  // Pin to the streaming row on each flush while the reader is at
  // the bottom: the virtualizer re-measures the growing row, so the
  // total size changes and the viewport would otherwise drift up.
  // (Replaces the ResizeObserver that used to follow streamed
  // growth; the observer could feed back through the virtualizer's
  // own re-measurement.)
  useEffect(() => {
    if (isTyping && autoScrollRef.current && totalCount > 0) {
      // A just-anchored prompt owns this commit: the layout effect
      // already scheduled its scroll to the top. Skip one pin run
      // so the view is not yanked to the bottom before the anchor
      // scroll runs; pinning resumes on the next streamed chunk.
      if (skipStreamingPinOnceRef.current) {
        skipStreamingPinOnceRef.current = false;
        return;
      }

      programmaticScrollUntilRef.current = Date.now() + 800;
      rowVirtualizer.scrollToIndex(totalCount - 1, {
        align: "end",
        behavior: "auto",
      });
    }
  }, [messages, isTyping, rowVirtualizer, totalCount]);

  // Reposition when the viewport changes.
  useEffect(() => {
    const handleResize = () => {
      if (autoScrollRef.current) {
        scheduleScroll("auto");
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [scheduleScroll]);

  // Clean up pending animation frames.
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (messages.length === 0 && !isTyping) {
    return null;
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-transparent">
      {/* Top edge fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-[#0B0B0C]/50 to-transparent"
      />

      {/* Load earlier messages: a floating pill, not an inline row —
          it must stay outside the virtualizer's measured area or
          scroll offsets drift by its height. */}
      {hasEarlierMessages && (
        <button
          type="button"
          onClick={handleLoadEarlier}
          disabled={loadingEarlierMessages}
          className="
            absolute left-1/2 top-3 z-30
            md:top-14
            inline-flex -translate-x-1/2 items-center gap-1.5
            rounded-full border border-white/[0.12]
            bg-[#19191D]/95 px-3.5 py-2
            text-xs font-medium text-zinc-300
            shadow-[0_8px_30px_rgba(0,0,0,0.45)]
            transition hover:border-[#D4AF37]/40
            hover:text-[#D4AF37]
            disabled:opacity-50
          "
        >
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
          {loadingEarlierMessages
            ? "Loading earlier messages…"
            : "Load earlier messages"}
        </button>
      )}

      {/* Scroll container. scroll-pt keeps the first row clear of the
          header bar, the top fade, and the overlaid desktop toolbar
          when scrolled (or jumped) to the top. */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          h-full min-h-0 overflow-y-auto overscroll-contain
          scroll-pt-12
          [scrollbar-color:#3f3f46_transparent]
          [scrollbar-width:thin]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-zinc-800
          hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
        "
      >
        <div
          className="
            mx-auto w-full max-w-5xl
            px-3 pb-10 pt-10
            sm:px-5 sm:pb-12 sm:pt-12
            lg:px-8 lg:pt-12
          "
        >
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index];

              return (
                <div
                  key={virtualItem.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  className="absolute left-0 top-0 w-full pb-7 sm:pb-9"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {message ? (
                    <MessageRow
                      message={message}
                      onForkMessage={onForkMessage}
                      onOpenArtifact={onOpenArtifact}
                      isStreaming={
                        isTyping &&
                        message.role === "assistant" &&
                        virtualItem.index === messages.length - 1
                      }
                    />
                  ) : (
                    <TypingIndicator />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom edge fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[#0B0B0C]/30 to-transparent"
      />

      {/* Jump to latest */}
      {showScrollButton && messages.length > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label={newMessagesLabel(unreadCount)}
          title="Jump to latest"
          className="
            absolute bottom-5 left-1/2 z-30
            flex h-11 min-w-11 -translate-x-1/2
            items-center justify-center gap-2
            rounded-full border border-white/[0.12]
            bg-[#19191D]/95 px-3 text-zinc-300
            shadow-[0_8px_30px_rgba(0,0,0,0.45)]
            transition-all duration-200
            hover:-translate-x-1/2 hover:-translate-y-0.5
            hover:border-[#D4AF37]/40
            hover:bg-[#222225] hover:text-[#D4AF37]
            active:scale-95
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-[#D4AF37]
          "
        >
          <ArrowDown className="h-4 w-4" strokeWidth={2} />

          {unreadCount > 0 && (
            <span className="text-xs font-medium tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}