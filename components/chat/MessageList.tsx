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
  createdAt?: Date;
  status?: "sending" | "sent" | "error";
}

interface MessageListProps {
  messages?: Message[];
  isTyping?: boolean;
}

const BOTTOM_THRESHOLD = 100;
const TYPING_SPEED = 12;

export default function MessageList({
  messages = [],
  isTyping = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [showScrollButton, setShowScrollButton] =
    useState(false);

  const [displayedContent, setDisplayedContent] =
    useState("");

  const [isRevealing, setIsRevealing] =
    useState(false);

  const autoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);
  const firstRenderRef = useRef(true);

  const typingTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

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
     TYPE / REVEAL AI RESPONSE
  ===================================================== */

  useEffect(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const latestMessage =
      messages[messages.length - 1];

    /*
     * If AI is still processing and there is no
     * assistant response yet, show the normal
     * thinking indicator.
     */
    if (
      isTyping &&
      (!latestMessage ||
        latestMessage.role !== "assistant")
    ) {
      setDisplayedContent("");
      setIsRevealing(false);
      return;
    }

    /*
     * Find the latest assistant response.
     */
    if (
      latestMessage &&
      latestMessage.role === "assistant"
    ) {
      const fullContent = latestMessage.content;

      /*
       * If this is a new assistant response,
       * reveal it from the beginning.
       */
      if (
        !displayedContent ||
        !fullContent.startsWith(displayedContent)
      ) {
        setDisplayedContent("");
        setIsRevealing(true);

        let currentIndex = 0;

        const revealNext = () => {
          currentIndex += 1;

          setDisplayedContent(
            fullContent.slice(0, currentIndex)
          );

          if (currentIndex < fullContent.length) {
            /*
             * Small natural variation keeps the
             * animation from feeling too robotic.
             */
            const delay =
              TYPING_SPEED +
              Math.random() * 10;

            typingTimerRef.current =
              setTimeout(revealNext, delay);
          } else {
            setIsRevealing(false);
            typingTimerRef.current = null;
          }
        };

        typingTimerRef.current =
          setTimeout(revealNext, TYPING_SPEED);

        return () => {
          if (typingTimerRef.current) {
            clearTimeout(
              typingTimerRef.current
            );
          }
        };
      }
    }

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [messages, isTyping]);

  /* =====================================================
     NEW MESSAGE / TYPING AUTO SCROLL
  ===================================================== */

  useEffect(() => {
    const newMessageAdded =
      messages.length >
      previousMessageCountRef.current;

    previousMessageCountRef.current =
      messages.length;

    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      if (messages.length > 0) {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      }

      return;
    }

    if (!autoScrollRef.current) return;

    if (
      newMessageAdded ||
      isTyping ||
      isRevealing
    ) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [
    messages.length,
    isTyping,
    isRevealing,
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

  /* =====================================================
     CLEANUP TIMER
  ===================================================== */

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(
          typingTimerRef.current
        );
      }
    };
  }, []);

  if (messages.length === 0 && !isTyping) {
    return null;
  }

  const latestMessage =
    messages[messages.length - 1];

  const showingAssistant =
    latestMessage?.role === "assistant";

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-transparent">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="
          h-full
          min-h-0
          overflow-y-auto
          overscroll-contain
          scroll-smooth
          px-3
          py-5
          pb-7
          sm:px-5
          sm:py-6
          sm:pb-8
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
          {messages.map((message, index) => {
            const isLatestAssistant =
              index === messages.length - 1 &&
              message.role === "assistant";

            /*
             * Latest assistant message is revealed
             * progressively. Older messages stay normal.
             */
            if (isLatestAssistant) {
              return (
                <ChatMessageBubble
                  key={message.id}
                  role={message.role}
                  content={displayedContent}
                />
              );
            }

            return (
              <ChatMessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
              />
            );
          })}

          {/* =================================================
              AI THINKING
          ================================================= */}

          {isTyping && !showingAssistant && (
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
                <Sparkles
                  className="h-3.5 w-3.5 text-[#D4AF37]"
                  strokeWidth={1.8}
                />
              </div>

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
                "
                aria-label="ANVIX AI is thinking"
              >
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D4AF37]" />
              </div>
            </div>
          )}

          {/* =================================================
              CURSOR WHILE RESPONSE IS BEING REVEALED
          ================================================= */}

          {showingAssistant && isRevealing && (
            <span
              className="
                ml-11
                inline-block
                h-4
                w-[2px]
                animate-pulse
                bg-[#D4AF37]
              "
              aria-hidden="true"
            />
          )}

          <div
            ref={bottomRef}
            className="h-1 w-full"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* =====================================================
          JUMP TO LATEST
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