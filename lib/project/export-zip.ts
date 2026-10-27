import type { GeneratedProject } from "./project-schema";

/**
 * Dependency-free ZIP export (stored entries, no compression).
 *
 * A generated project should leave the browser as real files, not only
 * as pixels on screen. This builds a valid ZIP archive with plain
 * stored (method 0) entries, so no compression library is needed and
 * the output opens in every unzip tool. Filenames are UTF-8 flagged.
 */

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isSafeZipPath(path: string): boolean {
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return false;
  return !path.split("/").some((part) => part === ".." || part === "");
}

interface ZipEntry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localHeaderOffset: number;
}

function appendUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function appendUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

/** Build a ZIP archive (stored entries) for the project's files. */
export function buildProjectZip(
  files: Array<{ path: string; content: string }>
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  const push = (bytes: Uint8Array): void => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  for (const file of files) {
    if (!isSafeZipPath(file.path)) {
      throw new Error(`Unsafe file path for ZIP export: ${file.path}`);
    }

    const nameBytes = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    appendUint32(localView, 0, 0x04034b50);
    appendUint16(localView, 4, 20);
    appendUint16(localView, 6, 0x0800);
    appendUint16(localView, 8, 0);
    appendUint16(localView, 10, 0);
    appendUint16(localView, 12, 0);
    appendUint32(localView, 14, crc);
    appendUint32(localView, 18, data.length);
    appendUint32(localView, 22, data.length);
    appendUint16(localView, 26, nameBytes.length);
    appendUint16(localView, 28, 0);

    entries.push({
      nameBytes,
      data,
      crc,
      localHeaderOffset: offset,
    });

    push(localHeader);
    push(nameBytes);
    push(data);
  }

  const centralStart = offset;

  for (const entry of entries) {
    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    appendUint32(centralView, 0, 0x02014b50);
    appendUint16(centralView, 4, 20);
    appendUint16(centralView, 6, 20);
    appendUint16(centralView, 8, 0x0800);
    appendUint16(centralView, 10, 0);
    appendUint16(centralView, 12, 0);
    appendUint16(centralView, 14, 0);
    appendUint32(centralView, 16, entry.crc);
    appendUint32(centralView, 20, entry.data.length);
    appendUint32(centralView, 24, entry.data.length);
    appendUint16(centralView, 28, entry.nameBytes.length);
    appendUint16(centralView, 30, 0);
    appendUint16(centralView, 32, 0);
    appendUint16(centralView, 34, 0);
    appendUint16(centralView, 36, 0);
    appendUint32(centralView, 38, 0);
    appendUint32(centralView, 42, entry.localHeaderOffset);

    push(centralHeader);
    push(entry.nameBytes);
  }

  const centralSize = offset - centralStart;

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  appendUint32(endView, 0, 0x06054b50);
  appendUint16(endView, 4, 0);
  appendUint16(endView, 6, 0);
  appendUint16(endView, 8, entries.length);
  appendUint16(endView, 10, entries.length);
  appendUint32(endView, 12, centralSize);
  appendUint32(endView, 16, centralStart);
  appendUint16(endView, 20, 0);

  push(endRecord);

  const archive = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of chunks) {
    archive.set(chunk, cursor);
    cursor += chunk.length;
  }
  return archive;
}

/** Download the project as a `<name>.zip` file. Browser-only. */
export function downloadProjectZip(project: GeneratedProject): void {
  const archive = buildProjectZip(project.files);
  const blob = new Blob([archive as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const safeName =
    project.name.trim().replace(/[^A-Za-z0-9._-]+/g, "-") || "project";

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
