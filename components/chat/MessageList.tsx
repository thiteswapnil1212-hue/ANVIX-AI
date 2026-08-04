"use client";

import ChatMessageBubble from "./ChatMessageBubble";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export default function MessageList({ messages = defaultMessages }: { messages?: Message[] }) {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        {messages.map((m) => (
          <ChatMessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
      </div>
    </div>
  );
}

const defaultMessages: Message[] = [
  { id: "1", role: "assistant", content: "Hello! How can I help you today?" },
  { id: "2", role: "user", content: "Show me an example of the project structure." },
  { id: "3", role: "assistant", content: "Sure — here's a brief overview..." },
];