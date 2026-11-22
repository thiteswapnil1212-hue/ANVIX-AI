import {
  MAX_ATTACHMENTS,
  MAX_PDF_BYTES,
  isSupportedAttachmentMime,
  type ChatAttachmentInput,
} from "./chat-attachments.ts";

/**
 * Client-side attachment preparation (browser only — never import
 * this from server code).
 *
 * Images are downscaled on a canvas to max 768px on the long edge
 * and re-encoded as JPEG (~0.82) before sending, so the request
 * stays far under Vercel's 4.5 MB body limit. PDFs are sent as-is
 * (capped at 3 MB raw). The server re-validates everything.
 */

export const MAX_IMAGE_EDGE_PX = 768;
export const IMAGE_JPEG_QUALITY = 0.82;

export type PreparedAttachments = {
  attachments: ChatAttachmentInput[];
  errors: string[];
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      // Strip the `data:<mime>;base64,` prefix.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    image.src = url;
  });
}

function downscaleImageToBase64(
  image: HTMLImageElement
): Promise<string> {
  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not process image."));
          return;
        }
        void fileToBase64(
          new File([blob], "image.jpg", { type: "image/jpeg" })
        ).then(resolve, reject);
      },
      "image/jpeg",
      IMAGE_JPEG_QUALITY
    );
  });
}

/**
 * Turn user-picked files into validated, downscaled attachments.
 * Files that fail (wrong type, PDF too big, unreadable) are skipped
 * and reported in `errors` instead of failing the whole batch.
 */
export async function prepareAttachmentFiles(
  files: File[],
  alreadyAttached: number
): Promise<PreparedAttachments> {
  const attachments: ChatAttachmentInput[] = [];
  const errors: string[] = [];
  const slotsLeft = MAX_ATTACHMENTS - alreadyAttached;

  for (const file of files) {
    if (attachments.length >= slotsLeft) {
      errors.push(`Send at most ${MAX_ATTACHMENTS} files per message.`);
      break;
    }

    if (!isSupportedAttachmentMime(file.type)) {
      errors.push(
        `"${file.name}" is not supported — send JPG, PNG, WebP or PDF.`
      );
      continue;
    }

    try {
      if (file.type === "application/pdf") {
        if (file.size > MAX_PDF_BYTES) {
          errors.push(`"${file.name}" is over the 3 MB PDF limit.`);
          continue;
        }
        attachments.push({
          name: file.name,
          mimeType: file.type,
          data: await fileToBase64(file),
        });
      } else {
        const image = await loadImage(file);
        attachments.push({
          name: file.name,
          mimeType: "image/jpeg",
          data: await downscaleImageToBase64(image),
        });
      }
    } catch {
      errors.push(`Could not read "${file.name}".`);
    }
  }

  return { attachments, errors };
}
