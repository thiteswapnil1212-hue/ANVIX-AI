import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ANVIX AI handles your data.",
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "1. The short version",
    body: [
      "ANVIX AI has no user accounts today. We do not run a database of your chats or projects, we do not sell data, and we do not use advertising or analytics trackers. Your work is stored in your own browser, and your prompts are processed by an AI provider to generate the response you asked for.",
    ],
  },
  {
    heading: "2. Data stored in your browser",
    body: [
      "Chats, generated projects, and workspace settings are saved in your browser's local storage and session storage so the app can show them back to you. This data stays on your device. It is removed when you clear your browser storage, and session-storage items (including generated projects) are removed when the browser session ends. Anyone with access to your device and browser profile can see this data, so use the export and delete controls in the app on shared machines.",
    ],
  },
  {
    heading: "3. Prompts sent to AI providers",
    body: [
      "When you send a chat message or ask ANVIX to generate or build something, your prompt is sent through ANVIX's server API routes to Google's Gemini API, which generates the response. Do not include passwords, API keys, personal data, or confidential code in prompts. Google's handling of API data is governed by Google's own terms and privacy policies for the Gemini API.",
    ],
  },
  {
    heading: "4. Hosting and server logs",
    body: [
      "ANVIX is hosted on Vercel. Like any web host, Vercel processes standard request information (such as IP address, browser type, and timestamps) in server logs to operate and secure the service. ANVIX does not combine this with any profile, because no accounts exist.",
    ],
  },
  {
    heading: "5. Cookies",
    body: [
      "ANVIX does not set advertising or cross-site tracking cookies. The service worker used for the installable app caches static files on your device so pages load faster; you can clear it at any time through your browser's site-data controls.",
    ],
  },
  {
    heading: "6. Your controls",
    body: [
      "You can delete individual chats and projects inside the app, export your chats from the sidebar, and erase everything ANVIX stores by clearing site data for this domain in your browser settings.",
    ],
  },
  {
    heading: "7. Changes to this policy",
    body: [
      "If ANVIX introduces accounts, cloud storage, analytics, or payments, this policy will be updated before or alongside those features, and the changes will be posted on this page.",
    ],
  },
  {
    heading: "8. Contact",
    body: [
      "Privacy questions can be raised through the project's GitHub repository: github.com/thiteswapnil1212-hue/ANVIX-AI.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Last updated: 21 October 2026
        </p>

        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold text-white">
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="mt-2.5 text-sm leading-7 text-zinc-400"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
