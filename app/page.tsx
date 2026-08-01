import Navbar from "@/components/layout/Navbar";
import Hero from "@/features/landing/Hero";
import PromptEditor from "@/components/ai/PromptEditor";
import PromptToolbar from "@/components/ai/PromptToolbar";
import ThinkingPanel from "@/components/ai/ThinkingPanel";

import AIStatus from "@/features/landing/AIStatus";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909]">
      <Navbar />

      <Hero />
      <div className="mx-auto mt-12 max-w-5xl px-6">
  <PromptEditor />
</div>
<div className="mx-auto mt-8 max-w-5xl px-6">
  <ThinkingPanel />
</div>
<PromptToolbar />
      <AIStatus />
    </main>
  );
}