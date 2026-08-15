import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ANVIX AI",
    template: "%s | ANVIX AI",
  },
  description:
    "ANVIX AI — an intelligent software engineering platform for building, exploring, and shipping AI-powered products.",
  applicationName: "ANVIX AI",

  keywords: [
    "ANVIX AI",
    "AI software engineering",
    "AI development",
    "AI workspace",
    "AI coding",
    "developer tools",
  ],

  authors: [
    {
      name: "ANVIX AI",
    },
  ],

  creator: "ANVIX AI",
  publisher: "ANVIX AI",

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    title: "ANVIX AI",
    description:
      "Build, explore, and ship AI-powered software with ANVIX AI.",
    siteName: "ANVIX AI",
  },

  twitter: {
    card: "summary_large_image",
    title: "ANVIX AI",
    description:
      "An intelligent software engineering platform for building AI-powered products.",
  },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#090909] font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}