
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

const BOTTOM_THRESHOLD = 100;
const CHARS_PER_FRAME = 5;
const FRAME_DELAY_MS = 16;

export default function MessageList({
  messages = [],
  isTyping = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const displayedContentRef = useRef("");
  const activeMessageIdRef = useRef<string | null>(null);
  const autoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);
  const firstRenderRef = useRef(true);

  const animationTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);

  const latestMessage = messages[messages.length - 1];
  const showingAssistant = latestMessage?.role === "assistant";

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

  // Smoothly reveal the latest assistant response.
  useEffect(() => {
    if (animationTimerRef.current !== null) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    if (!showingAssistant || !latestMessage) {
      activeMessageIdRef.current = null;
      displayedContentRef.current = "";
      setDisplayedContent("");
      setIsRevealing(false);
      return;
    }

    const { id, content } = latestMessage;
    const isNewMessage = activeMessageIdRef.current !== id;

    if (isNewMessage) {
      activeMessageIdRef.current = id;
      displayedContentRef.current = "";
      setDisplayedContent("");
    }

    let currentIndex = displayedContentRef.current.length;

    // If the content was replaced, start this message again.
    if (!content.startsWith(displayedContentRef.current)) {
      currentIndex = 0;
      displayedContentRef.current = "";
      setDisplayedContent("");
    }

    if (currentIndex >= content.length) {
      setIsRevealing(false);
      return;
    }

    let cancelled = false;
    setIsRevealing(true);

    const revealNext = () => {
      if (cancelled) return;

      currentIndex = Math.min(
        currentIndex + CHARS_PER_FRAME,
        content.length
      );

      const nextContent = content.slice(0, currentIndex);

      displayedContentRef.current = nextContent;
      setDisplayedContent(nextContent);

      if (currentIndex < content.length) {
        animationTimerRef.current = setTimeout(
          revealNext,
          FRAME_DELAY_MS
        );
      } else {
        animationTimerRef.current = null;
        setIsRevealing(false);
      }
    };

    animationTimerRef.current = setTimeout(
      revealNext,
      FRAME_DELAY_MS
    );

    return () => {
      cancelled = true;

      if (animationTimerRef.current !== null) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [
    latestMessage?.id,
    latestMessage?.content,
    showingAssistant,
  ]);

  // Keep the latest message in view without overriding user scrolling.
  useEffect(() => {
    const newMessageAdded =
      messages.length > previousMessageCountRef.current;

    previousMessageCountRef.current = messages.length;

    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      if (messages.length > 0) {
        scheduleScroll("auto");
      }

      return;
    }

    if (!autoScrollRef.current) return;

    if (newMessageAdded || isTyping || isRevealing) {
      scheduleScroll("smooth");
    }
  }, [
    messages.length,
    isTyping,
    isRevealing,
    scheduleScroll,
  ]);

  // Adjust scroll position when the viewport changes.
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

      if (animationTimerRef.current !== null) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  if (messages.length === 0 && !isTyping) {
    return null;
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-transparent">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          h-full min-h-0 overflow-y-auto overscroll-contain
          px-3 py-5 pb-7 sm:px-5 sm:py-6 sm:pb-8 lg:px-8
          [scrollbar-color:#3f3f46_transparent]
          [scrollbar-width:thin]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-zinc-800
          hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
        "
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-4">
  {messages.map((message, index) => {
    const isLatestAssistant =
      index === messages.length - 1 &&
      message.role === "assistant";

    return (
      <ChatMessageBubble
        key={message.id}
        role={message.role}
        content={
          isLatestAssistant
            ? isTyping && !message.content
              ? "Thinking..."
              : displayedContent
            : message.content
        }
      />
    );
  })}

          {isTyping && (!showingAssistant || !latestMessage?.content) && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#151518]">
                <Sparkles
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  strokeWidth={1.8}
                />
              </div>

              <div
                className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[#2F2F33] bg-[#18181B] px-4 py-3.5"
                aria-label="ANVIX AI is thinking"
                role="status"
              >
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D4AF37]" />
              </div>
            </div>
          )}

          {showingAssistant && isRevealing && (
            <span
              className="ml-11 inline-block h-4 w-[2px] animate-pulse bg-[#D4AF37]"
              aria-hidden="true"
            />
          )}

          <div className="h-1 w-full" aria-hidden="true" />
        </div>
      </div>

      {showScrollButton && messages.length > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Jump to latest message"
          title="Jump to latest"
          className="
            absolute bottom-6 left-1/2 z-30
            flex h-10 w-10 -translate-x-1/2
            items-center justify-center rounded-full
            border border-zinc-700 bg-[#18181B]/95
            text-zinc-300 shadow-[0_10px_35px_rgba(0,0,0,0.5)]
            backdrop-blur-xl transition-all duration-200
            hover:border-[#D4AF37]/40 hover:bg-[#222225]
            hover:text-[#D4AF37] active:scale-90
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