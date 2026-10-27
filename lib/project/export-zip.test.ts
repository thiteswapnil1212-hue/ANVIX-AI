import test from "node:test";
import assert from "node:assert/strict";

import { buildProjectZip, crc32 } from "./export-zip.ts";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("")), 0x00000000);
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function findSignature(bytes: Uint8Array, signature: number): number {
  for (let index = 0; index + 4 <= bytes.length; index += 1) {
    if (readUint32(bytes, index) === signature) return index;
  }
  return -1;
}

test("buildProjectZip round-trips file contents through local headers", () => {
  const archive = buildProjectZip([
    { path: "package.json", content: '{"name":"demo"}' },
    { path: "app/page.tsx", content: "export default function Page(){}" },
  ]);

  // First local header at offset 0.
  assert.equal(readUint32(archive, 0), 0x04034b50);
  assert.equal(readUint16(archive, 8), 0, "stored method");
  const firstNameLength = readUint16(archive, 26);
  const firstDataLength = readUint32(archive, 22);
  const firstName = new TextDecoder().decode(
    archive.slice(30, 30 + firstNameLength)
  );
  const firstData = new TextDecoder().decode(
    archive.slice(30 + firstNameLength, 30 + firstNameLength + firstDataLength)
  );
  assert.equal(firstName, "package.json");
  assert.equal(firstData, '{"name":"demo"}');
  assert.equal(readUint32(archive, 14), crc32(new TextEncoder().encode(firstData)));

  assert.notEqual(findSignature(archive, 0x02014b50), -1, "central directory");
  assert.notEqual(findSignature(archive, 0x06054b50), -1, "end record");
});

test("buildProjectZip keeps unicode names and contents intact", () => {
  const archive = buildProjectZip([
    { path: "café/notes.txt", content: "héllo — ünïcode ✓" },
  ]);
  const nameLength = readUint16(archive, 26);
  const name = new TextDecoder().decode(archive.slice(30, 30 + nameLength));
  assert.equal(name, "café/notes.txt");
  assert.equal(readUint16(archive, 6) & 0x0800, 0x0800, "UTF-8 flag set");
});

test("buildProjectZip rejects unsafe paths", () => {
  assert.throws(
    () => buildProjectZip([{ path: "../escape.txt", content: "x" }]),
    /Unsafe file path/
  );
  assert.throws(
    () => buildProjectZip([{ path: "/absolute.txt", content: "x" }]),
    /Unsafe file path/
  );
});

test("buildProjectZip of an empty project is still a valid empty archive", () => {
  const archive = buildProjectZip([]);
  assert.equal(archive.length, 22);
  assert.equal(readUint32(archive, 0), 0x06054b50);
  assert.equal(readUint16(archive, 8), 0, "zero entries");
});
