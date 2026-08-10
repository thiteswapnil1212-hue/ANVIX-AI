"use client";

import { useEffect, useRef } from "react";
import { Bug, BarChart3, Code2, Wrench } from "lucide-react";
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

const promptCards = [
  {
    id: "development",
    title: "Development",
    label: "Explain this code",
    icon: Code2,
  },
  {
    id: "engineering",
    title: "Engineering",
    label: "Build a Next.js component",
    icon: Wrench,
  },
  {
    id: "data-science",
    title: "Data Science",
    label: "Analyze this dataset",
    icon: BarChart3,
  },
  {
    id: "debugging",
    title: "Debugging",
    label: "Help me debug an error",
    icon: Bug,
  },
];

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
    <div className="flex min-h-[420px] flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-0 py-5 sm:px-0">
        {messages.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-10 px-4 text-center sm:px-0">
            <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
              {promptCards.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.id}
                    type="button"
                    className="flex min-h-[170px] flex-col justify-between rounded-[12px] border border-[#3F3F46] bg-[#18181B] p-5 text-left transition hover:border-[#D4AF37] hover:bg-[#27272A]"
                  >
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-[#D4AF37]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-semibold text-white">{prompt.title}</span>
                    </div>
                    <p className="mt-4 text-base font-medium leading-6 text-white">
                      {prompt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-2 sm:px-0">
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

            {isTyping && <ChatMessageBubble role="assistant" content="Thinking..." />}
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