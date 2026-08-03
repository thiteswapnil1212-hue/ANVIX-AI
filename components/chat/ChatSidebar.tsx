import { Plus, MessageSquareText } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  preview: string;
}

interface ChatSidebarProps {
  threads: Thread[];
  activeThread: string;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
}

export default function ChatSidebar({ threads, activeThread, onSelectThread, onNewThread }: ChatSidebarProps) {
  return (
    <aside className="flex h-full flex-col rounded-3xl border border-zinc-800/80 bg-[#0D0D0D] p-4">
      <button
        type="button"
        onClick={onNewThread}
        className="flex items-center justify-center gap-2 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-3 text-sm font-semibold text-[#F3D37C] transition hover:bg-[#D4AF37]/20"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>

      <div className="mt-5 space-y-2">
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelectThread(thread.id)}
            className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
              activeThread === thread.id
                ? "border-[#D4AF37]/30 bg-[#D4AF37]/10"
                : "border-transparent bg-transparent hover:border-zinc-800 hover:bg-[#111111]"
            }`}
          >
            <MessageSquareText className={`mt-0.5 h-4 w-4 ${activeThread === thread.id ? "text-[#D4AF37]" : "text-zinc-500"}`} />
            <div>
              <p className="text-sm font-medium text-white">{thread.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{thread.preview}</p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
