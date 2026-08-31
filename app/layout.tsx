import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anvix-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ANVIX AI — Build Beyond Limits",
    template: "%s | ANVIX AI",
  },
  description:
    "ANVIX AI is an intelligent AI assistant and software engineering platform for building, exploring, and shipping AI-powered products faster.",
  applicationName: "ANVIX AI",
  manifest: "/manifest.webmanifest",
  keywords: [
    "ANVIX AI",
    "AI software engineering",
    "AI development platform",
    "AI coding platform",
    "AI developer tools",
    "AI workspace",
    "AI-powered development",
  ],
  authors: [{ name: "ANVIX AI" }],
  creator: "ANVIX AI",
  publisher: "ANVIX AI",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", type: "image/png" },
      { url: "/icon-512.png", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "ANVIX AI — Build Beyond Limits",
    description:
      "Build, explore, and ship AI-powered software with an intelligent development platform designed for speed and scale.",
    siteName: "ANVIX AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANVIX AI — Build Beyond Limits",
    description:
      "Build, explore, and ship AI-powered products faster with ANVIX AI.",
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
      <head>
        <meta
          name="google-site-verification"
          content="LcyAJt9BmZijUliyiotG_GuaVDetCm_KdFAMkJ9P2hA"
        />
      </head>
      <body className="min-h-screen bg-[#090909] font-sans text-white antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}