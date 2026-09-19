
import type { MetadataRoute } from "next";

const APP_NAME = "ANVIX AI";
const APP_SHORT_NAME = "ANVIX";
const APP_DESCRIPTION =
  "Your AI-powered workspace for exploring ideas, writing code, and building software.";

const APP_THEME_COLOR = "#09090B";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,

    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",

    lang: "en",
    dir: "ltr",

    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,

    categories: ["productivity", "utilities", "developer"],

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
        description: "Open a new ANVIX AI chat",
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