import Navbar from "@/components/layout/Navbar";
import Hero from "@/features/landing/Hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909]">
      <Navbar />
      <Hero />
    </main>
  );
}