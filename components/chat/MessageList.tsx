"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, MessageSquare } from "lucide-react";
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

const BOTTOM_THRESHOLD = 120;

export default function MessageList({
  messages = [],
  isTyping = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [showScrollButton, setShowScrollButton] =
    useState(false);

  const shouldAutoScrollRef = useRef(true);
  const previousMessageCount = useRef(messages.length);

  /* =====================================================
     CHECK WHETHER USER IS NEAR BOTTOM
  ===================================================== */
  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) return true;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    return distanceFromBottom <= BOTTOM_THRESHOLD;
  }, []);

  /* =====================================================
     SCROLL TO BOTTOM
  ===================================================== */
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      bottomRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });

      shouldAutoScrollRef.current = true;
      setShowScrollButton(false);
    },
    []
  );

  /* =====================================================
     HANDLE USER SCROLL
  ===================================================== */
  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom();

    shouldAutoScrollRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }, [isNearBottom]);

  /* =====================================================
     AUTO SCROLL WHEN NEW CONTENT ARRIVES
  ===================================================== */
  useEffect(() => {
    const newMessageAdded =
      messages.length > previousMessageCount.current;

    previousMessageCount.current = messages.length;

    if (
      shouldAutoScrollRef.current &&
      (newMessageAdded || isTyping)
    ) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [messages.length, isTyping, scrollToBottom]);

  /* =====================================================
     INITIAL POSITION
  ===================================================== */
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    }
  }, [scrollToBottom]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {/* =================================================
          SCROLL CONTAINER
      ================================================= */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          h-full
          overflow-y-auto
          overscroll-contain
          px-3
          py-6
          sm:px-5
          lg:px-6
          [scrollbar-color:#3f3f46_transparent]
          [scrollbar-width:thin]
        "
      >
        {/* =================================================
            EMPTY STATE
        ================================================= */}
        {messages.length === 0 ? (
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-xl px-4 text-center">
              <div
                className="
                  mx-auto
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-[#3F3F46]
                  bg-[#151518]
                  shadow-[0_10px_40px_rgba(0,0,0,0.25)]
                "
              >
                <MessageSquare
                  className="h-6 w-6 text-[#D4AF37]"
                  strokeWidth={1.7}
                />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                Start a conversation
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Ask ANVIX AI to explain something, build an
                application, debug code, or help you explore
                an idea.
              </p>
            </div>
          </div>
        ) : (
          /* =================================================
             MESSAGE STACK
          ================================================= */
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

            {/* =================================================
                TYPING INDICATOR
            ================================================= */}
            {isTyping && (
              <div className="flex items-start gap-3">
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
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37]" />
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-1
                    rounded-2xl
                    rounded-tl-md
                    border
                    border-[#2F2F33]
                    bg-[#18181B]
                    px-4
                    py-3
                  "
                >
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
                </div>
              </div>
            )}

            {/* Bottom anchor */}
            <div
              ref={bottomRef}
              className="h-px w-full"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* =====================================================
          JUMP TO LATEST
      ===================================================== */}
      {showScrollButton && messages.length > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Jump to latest message"
          className="
            absolute
            bottom-5
            left-1/2
            z-20
            flex
            h-9
            w-9
            -translate-x-1/2
            items-center
            justify-center
            rounded-full
            border
            border-zinc-700
            bg-[#18181B]/95
            text-zinc-300
            shadow-[0_10px_30px_rgba(0,0,0,0.45)]
            backdrop-blur-xl
            transition-all
            duration-200
            hover:border-[#D4AF37]/40
            hover:bg-[#222225]
            hover:text-[#D4AF37]
            active:scale-95
          "
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}