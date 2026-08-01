import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anvix AI",
  description: "AI Software Engineering Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#090909] text-white antialiased">
        {children}
      </body>
    </html>
  );
}