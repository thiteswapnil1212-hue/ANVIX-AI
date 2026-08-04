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
  messages = defaultMessages,
  isTyping = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
        
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-700">
                Start a conversation 🚀
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Ask anything and I will help you.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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


const defaultMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! How can I help you today?",
    status: "sent",
  },
  {
    id: "2",
    role: "user",
    content: "Show me an example of the project structure.",
    status: "sent",
  },
  {
    id: "3",
    role: "assistant",
    content: "Sure — here's a brief overview...",
    status: "sent",
  },
];