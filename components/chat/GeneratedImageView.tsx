"use client";

import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import {
  GENERATED_IMAGE_NOTE,
  type GeneratedImage,
} from "@/lib/image-client";

/**
 * A generated image rendered like an attachment: the image itself,
 * its prompt as caption, and the honest "free community model" note.
 * If the image itself fails to load (Pollinations down, or the lane
 * is throttling), the prompt + a retry note show instead of a broken
 * box — the message is never silently empty.
 */
export default function GeneratedImageView({
  image,
}: {
  image: GeneratedImage;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <p className="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
          <ImageOff className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
          Image couldn&apos;t load
        </p>
        <p className="mt-1 text-[13px] leading-6 text-zinc-400">
          “{image.prompt}” — the free image service may be busy. Try
          generating it again in a minute.
        </p>
      </div>
    );
  }

  return (
    <figure className="mb-2 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={`Generated image: ${image.prompt}`}
        width={768}
        height={768}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-auto w-full max-w-[512px] rounded-xl border border-white/10 bg-white/[0.03] object-cover"
      />
      <figcaption className="mt-2 min-w-0">
        <p className="truncate text-[13px] text-zinc-400">
          “{image.prompt}”
        </p>
        <p className="mt-0.5 text-[11px] leading-5 text-zinc-600">
          {GENERATED_IMAGE_NOTE}
        </p>
        {image.sourceUrl ? (
          <a
            href={image.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 underline underline-offset-4 transition-colors hover:text-[#E9C96B]"
          >
            Open original
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
