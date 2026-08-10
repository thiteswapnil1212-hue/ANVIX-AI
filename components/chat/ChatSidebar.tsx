import { Plus, Calendar, History, Settings, User } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  preview: string;
}

interface ChatSidebarProps {
  threads?: Thread[];
  activeThread?: string;
  onSelectThread?: (id: string) => void;
  onNewThread?: () => void;
}

const historyItems = [
  { id: "today", label: "Today", icon: Calendar, active: true },
  { id: "yesterday", label: "Yesterday", icon: History, active: false },
  { id: "week", label: "Previous 7 Days", icon: History, active: false },
];

export default function ChatSidebar({
  threads = [],
  activeThread = "",
  onSelectThread = () => {},
  onNewThread = () => {},
}: ChatSidebarProps) {
  return (
    <div className="flex h-full flex-col border-r border-[#3F3F46] bg-[#18181B] px-4 py-5">
      <div className="flex items-center gap-3 rounded-3xl border border-[#3F3F46] bg-[#0F0F10] p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#0F0F10] text-[#D4AF37]">
          A
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">ANVIX AI</p>
          <p className="mt-1 text-xs text-zinc-500">Expert Partner</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewThread}
        className="mt-5 flex items-center justify-center gap-2 rounded-[12px] bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#E5C158]"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </button>

      <div className="mt-7 space-y-2">
        {historyItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center gap-3 rounded-[12px] border px-3 py-3 text-left transition ${
                item.active
                  ? "border-[#3F3F46] bg-[#27272A] text-[#D4AF37]"
                  : "border-transparent text-zinc-400 hover:border-[#3F3F46] hover:bg-[#27272A] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto border-t border-[#3F3F46] pt-4">
        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-white"
          >
            <User className="h-4 w-4" />
            Profile
          </button>
        </div>
      </div>
    </div>
  );
}
