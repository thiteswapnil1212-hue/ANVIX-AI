/**
 * Chat attachment validation (Wave 2 upload, §7).
 *
 * Server-side re-check of what the client already enforces: the
 * client downscales images to ~768px before sending, but the server
 * must never trust that. Limits keep the request under Vercel's
 * 4.5 MB body cap: max 3 files/message, PDFs ≤ 3 MB raw, images
 * ≤ 2 MB decoded, total base64 payload ≤ 4,000,000 chars (~3 MB
 * decoded). Supported: JPEG / PNG / WebP images + PDF.
 */

export type ChatAttachmentInput = {
  /** Original file name, for the UI chip. */
  name: string;
  mimeType: string;
  /** Raw base64 (no `data:` prefix). */
  data: string;
};

export const MAX_ATTACHMENTS = 3;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BASE64_CHARS = 4_000_000;

export const SUPPORTED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const SUPPORTED_ATTACHMENT_MIMES = [
  ...SUPPORTED_IMAGE_MIMES,
  "application/pdf",
] as const;

export function isSupportedAttachmentMime(mime: unknown): boolean {
  return (
    typeof mime === "string" &&
    (SUPPORTED_ATTACHMENT_MIMES as readonly string[]).includes(mime)
  );
}

export function isImageMime(mime: string): boolean {
  return (SUPPORTED_IMAGE_MIMES as readonly string[]).includes(mime);
}

/** Base64 length → approximate decoded byte count. */
export function estimateDecodedBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

const BASE64_PATTERN = /^[A-Za-z0-9+/=_-]+$/;

export type ValidateAttachmentsResult =
  | { ok: true; attachments: ChatAttachmentInput[] }
  | { ok: false; error: string };

/**
 * Validate an untrusted `attachments` request field. Returns the
 * cleaned list on success, or a user-facing error string. Never
 * throws on malformed input.
 */
export function validateAttachments(
  value: unknown
): ValidateAttachmentsResult {
  if (value === undefined || value === null) {
    return { ok: true, attachments: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Attachments must be a list of files." };
  }

  if (value.length > MAX_ATTACHMENTS) {
    return {
      ok: false,
      error: `Send at most ${MAX_ATTACHMENTS} files per message.`,
    };
  }

  const attachments: ChatAttachmentInput[] = [];
  let totalBase64 = 0;

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Each attachment must be a file." };
    }

    const record = entry as Record<string, unknown>;
    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim().slice(0, 120)
        : "file";
    const mimeType = record.mimeType;
    const data = record.data;

    if (!isSupportedAttachmentMime(mimeType)) {
      return {
        ok: false,
        error: "Only JPG, PNG, WebP images and PDF files are supported.",
      };
    }

    if (
      typeof data !== "string" ||
      data.length === 0 ||
      !BASE64_PATTERN.test(data)
    ) {
      return {
        ok: false,
        error: `Attachment "${name}" is not valid file data.`,
      };
    }

    const decodedBytes = estimateDecodedBytes(data);
    const limit =
      mimeType === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;

    if (decodedBytes > limit) {
      return {
        ok: false,
        error:
          mimeType === "application/pdf"
            ? `PDF "${name}" is over the 3 MB limit.`
            : `Image "${name}" is over the 2 MB limit — try a smaller image.`,
      };
    }

    totalBase64 += data.length;
    attachments.push({
      name,
      mimeType: mimeType as string,
      data,
    });
  }

  if (totalBase64 > MAX_TOTAL_BASE64_CHARS) {
    return {
      ok: false,
      error: "Attachments are too large in total — send fewer or smaller files.",
    };
  }

  return { ok: true, attachments };
}

/** Shape the validated attachments into Gemini `inlineData` parts. */
export function attachmentsToInlineDataParts(
  attachments: ChatAttachmentInput[]
): { inlineData: { mimeType: string; data: string } }[] {
  return attachments.map((attachment) => ({
    inlineData: {
      mimeType: attachment.mimeType,
      data: attachment.data,
    },
  }));
}
