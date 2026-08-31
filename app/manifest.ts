import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ANVIX AI",
    short_name: "ANVIX",
    description:
      "ANVIX AI is an intelligent AI assistant and software engineering workspace for building, exploring, and shipping AI-powered products.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#090909",
    theme_color: "#090909",
    lang: "en",
    id: "/",
    scope: "/",
    categories: ["productivity", "utilities", "developer tools"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
