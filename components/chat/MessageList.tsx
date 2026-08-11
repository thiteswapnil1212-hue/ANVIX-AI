"use client";

import { useEffect, useRef } from "react";
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

export default function MessageList({
  messages = [],
  isTyping = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-0 py-5">
        {messages.length > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:px-0">
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

            {isTyping && (
              <ChatMessageBubble
                role="assistant"
                content="Thinking..."
              />
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}