import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ANVIX AI",
    short_name: "ANVIX",
    description:
      "Your AI-powered workspace for exploring ideas, writing code, and building software.",

    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",

    background_color: "#09090B",
    theme_color: "#09090B",

    categories: ["productivity", "utilities", "developer tools"],
    prefer_related_applications: false,

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
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
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    shortcuts: [
      {
        name: "Start a chat",
        short_name: "New chat",
        description: "Open ANVIX AI chat",
        url: "/chat",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Generate",
        short_name: "Generate",
        description: "Open the AI generation workspace",
        url: "/generate",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}