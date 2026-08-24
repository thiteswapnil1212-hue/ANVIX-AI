"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  MessageSquare,
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

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-[#09090B]">
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

        {messages.length === 0 ? (
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-xl px-4 text-center">
              {/* Icon */}
              <div
                className="
                  relative
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-[#3F3F46]
                  bg-[#151518]
                  shadow-[0_15px_50px_rgba(0,0,0,0.35)]
                "
              >
                <div
                  className="
                    absolute
                    inset-0
                    rounded-2xl
                    bg-[#D4AF37]/[0.04]
                    blur-xl
                  "
                />

                <Sparkles
                  className="
                    relative
                    h-6
                    w-6
                    text-[#D4AF37]
                  "
                  strokeWidth={1.6}
                />
              </div>

              <h2
                className="
                  mt-6
                  text-xl
                  font-semibold
                  tracking-tight
                  text-white
                "
              >
                How can I help you?
              </h2>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                  text-zinc-500
                "
              >
                Ask ANVIX AI to build something,
                explain a concept, debug your code,
                or explore a new idea.
              </p>

              {/* Suggestions */}
              <div
                className="
                  mt-7
                  flex
                  flex-wrap
                  justify-center
                  gap-2
                "
              >
                {[
                  "Build a website",
                  "Explain code",
                  "Debug my project",
                ].map((suggestion) => (
                  <div
                    key={suggestion}
                    className="
                      rounded-full
                      border
                      border-zinc-800
                      bg-[#111113]
                      px-3
                      py-1.5
                      text-xs
                      text-zinc-500
                    "
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* =================================================
             MESSAGE STACK
          ================================================= */

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
            {messages.map((message) => (
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
        )}
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