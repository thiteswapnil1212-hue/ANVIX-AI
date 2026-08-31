"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  Sparkles,
} from "lucide-react";
import ChatMessageBubble from "./ChatMessageBubble";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt?: Date;
  status?: "sending" | "sent" | "error";
}

interface MessageListProps {
  messages?: Message[];
  isTyping?: boolean;
}

const BOTTOM_THRESHOLD = 100;

export default function MessageList({
  messages = [],
  isTyping = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [showScrollButton, setShowScrollButton] =
    useState(false);

  const autoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);
  const firstRenderRef = useRef(true);

  /* =====================================================
     CHECK IF USER IS CLOSE TO BOTTOM
  ===================================================== */

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) return true;

    const distance =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    return distance <= BOTTOM_THRESHOLD;
  }, []);

  /* =====================================================
     SCROLL TO BOTTOM
  ===================================================== */

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

  /* =====================================================
     HANDLE USER SCROLL
  ===================================================== */

  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom();

    autoScrollRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }, [isNearBottom]);

  /* =====================================================
     NEW MESSAGE / TYPING AUTO SCROLL
  ===================================================== */

  useEffect(() => {
    const newMessageAdded =
      messages.length >
      previousMessageCountRef.current;

    previousMessageCountRef.current =
      messages.length;

    /*
      First render:
      Always start at latest message.
    */
    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      if (messages.length > 0) {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      }

      return;
    }

    /*
      If user intentionally scrolled upward,
      NEVER force them back down.
    */
    if (!autoScrollRef.current) return;

    /*
      New message or AI typing:
      Keep conversation anchored at bottom.
    */
    if (newMessageAdded || isTyping) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [
    messages.length,
    isTyping,
    scrollToBottom,
  ]);

  /* =====================================================
     HANDLE WINDOW RESIZE
  ===================================================== */

  useEffect(() => {
    const handleResize = () => {
      if (!autoScrollRef.current) return;

      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [scrollToBottom]);

  if (messages.length === 0 && !isTyping) {
    return null;
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-transparent">
      {/* =================================================
          SCROLL AREA
      ================================================= */}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          h-full
          overflow-y-auto
          overscroll-contain
          scroll-smooth
          px-3
          py-6
          sm:px-5
          lg:px-8

          [scrollbar-color:#3f3f46_transparent]
          [scrollbar-width:thin]

          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-zinc-800
          hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700
        "
      >
        {/* =================================================
            EMPTY STATE
        ================================================= */}

        <div
          className="
            mx-auto
            flex
            w-full
            max-w-4xl
            flex-col
            gap-6
            pb-4
          "
        >
          {messages.length > 0 &&
            messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

          {/* =================================================
              AI TYPING
          ================================================= */}

          {isTyping && (
            <div className="flex items-start gap-3">
              {/* AI icon */}
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-[#3F3F46]
                  bg-[#151518]
                "
              >
                <Sparkles
                  className="
                    h-3.5
                    w-3.5
                    text-[#D4AF37]
                  "
                />
              </div>

              {/* Typing bubble */}
              <div
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-2xl
                  rounded-tl-md
                  border
                  border-[#2F2F33]
                  bg-[#18181B]
                  px-4
                  py-3.5
                  shadow-[0_5px_20px_rgba(0,0,0,0.15)]
                "
                aria-label="ANVIX AI is thinking"
              >
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D4AF37]" />
              </div>
            </div>
          )}

          {/* Bottom anchor */}
          <div
            ref={bottomRef}
            className="h-1 w-full"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* =====================================================
          JUMP TO LATEST BUTTON
      ===================================================== */}

      {showScrollButton && messages.length > 0 && (
        <button
          type="button"
          onClick={() =>
            scrollToBottom("smooth")
          }
          aria-label="Jump to latest message"
          title="Jump to latest"
          className="
            absolute
            bottom-6
            left-1/2
            z-30
            flex
            h-10
            w-10
            -translate-x-1/2
            items-center
            justify-center
            rounded-full
            border
            border-zinc-700
            bg-[#18181B]/95
            text-zinc-300
            shadow-[0_10px_35px_rgba(0,0,0,0.5)]
            backdrop-blur-xl
            transition-all
            duration-200
            hover:border-[#D4AF37]/40
            hover:bg-[#222225]
            hover:text-[#D4AF37]
            hover:shadow-[0_10px_35px_rgba(212,175,55,0.12)]
            active:scale-90
          "
        >
          <ArrowDown
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}