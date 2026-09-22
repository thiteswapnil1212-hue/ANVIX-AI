
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import ChatMessageBubble from "./ChatMessageBubble";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt?: string | Date;
  status?: "sending" | "sent" | "error";
}

interface MessageListProps {
  messages?: Message[];
  isTyping?: boolean;
}

const BOTTOM_THRESHOLD = 120;

export default function MessageList({
  messages = [],
  isTyping = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);
  const previousLastMessageRef = useRef("");
  const firstRenderRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const latestMessage = messages[messages.length - 1];
  const showingAssistant = latestMessage?.role === "assistant";

  const shouldShowTypingIndicator =
    isTyping &&
    (!showingAssistant || !latestMessage?.content?.trim());

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) return true;

    const distance =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    return distance <= BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollRef.current;

      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });

      autoScrollRef.current = true;
      setShowScrollButton(false);
    },
    []
  );

  const scheduleScroll = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollToBottom(behavior);
        scrollFrameRef.current = null;
      });
    },
    [scrollToBottom]
  );

  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom();

    autoScrollRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }, [isNearBottom]);

  // Keep track of the latest message content too, not only message count.
  const lastMessageKey = latestMessage
    ? `${latestMessage.id}:${latestMessage.content.length}`
    : "";

  useEffect(() => {
    const newMessageAdded =
      messages.length > previousMessageCountRef.current;

    const messageContentChanged =
      lastMessageKey !== previousLastMessageRef.current;

    previousMessageCountRef.current = messages.length;
    previousLastMessageRef.current = lastMessageKey;

    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      if (messages.length > 0) {
        scheduleScroll("auto");
      }

      return;
    }

    if (!autoScrollRef.current) return;

    if (newMessageAdded || messageContentChanged || isTyping) {
      scheduleScroll("smooth");
    }
  }, [
    messages.length,
    lastMessageKey,
    isTyping,
    scheduleScroll,
  ]);

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
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  if (messages.length === 0 && !isTyping) {
    return null;
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-transparent">
      {/* Top and bottom edge fades */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-[#0B0B0C]/50 to-transparent"
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          h-full min-h-0 overflow-y-auto overscroll-contain
          scroll-smooth
          px-3 py-6 pb-10
          sm:px-5 sm:py-8 sm:pb-12
          lg:px-8 lg:py-10
          [scrollbar-color:#3f3f46_transparent]
          [scrollbar-width:thin]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-zinc-800
          hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
        "
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 pb-4 sm:gap-9">
          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
            />
          ))}

          {/* Single typing indicator */}
          {shouldShowTypingIndicator && (
            <div className="flex items-start gap-3 sm:gap-3.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07] shadow-[0_0_20px_rgba(212,175,55,0.04)]">
                <Sparkles
                  className="h-4 w-4 text-[#D4AF37]"
                  strokeWidth={1.8}
                />

                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#0B0B0C] bg-[#D4AF37]" />
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-zinc-500">
                  ANVIX AI
                </p>

                <div
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/[0.07] bg-[#151518] px-4 py-3"
                  aria-label="ANVIX AI is thinking"
                  role="status"
                >
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D4AF37]" />
                </div>
              </div>
            </div>
          )}

          <div className="h-1 w-full" aria-hidden="true" />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[#0B0B0C]/30 to-transparent"
      />

      {/* Jump to latest */}
      {showScrollButton && messages.length > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Jump to latest message"
          title="Jump to latest"
          className="
            absolute bottom-5 left-1/2 z-30
            flex h-11 w-11 -translate-x-1/2
            items-center justify-center rounded-full
            border border-white/[0.12]
            bg-[#19191D]/95 text-zinc-300
            shadow-[0_8px_30px_rgba(0,0,0,0.45)]
            backdrop-blur-xl
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
        </button>
      )}
    </div>
  );
}