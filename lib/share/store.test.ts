import test from "node:test";
import assert from "node:assert/strict";

import { findLiveShare, listShareComments } from "./store.ts";

/**
 * Minimal in-memory stand-in for the Supabase query builder: only the
 * calls the store makes (from/select/eq/order/maybeSingle/insert).
 */

type Row = Record<string, unknown>;

function fakeClient(tables: Record<string, Row[]>, missing: string[] = []) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const filters: Array<(row: Row) => boolean> = [];
      let ordering: { column: string; ascending: boolean } | null = null;

      const builder: Record<string, unknown> = {
        select() {
          return builder;
        },
        // Supabase list queries are awaited directly (the builder is
        // thenable), so the fake must be too.
        then(
          resolve: (value: { data: Row[] | null; error: unknown }) => void
        ) {
          if (missing.includes(table)) {
            resolve({
              data: null,
              error: { code: "42P01", message: `relation "public.${table}" does not exist` },
            });
            return;
          }
          let matched = rows.filter((row) => filters.every((f) => f(row)));
          if (ordering) {
            const { column, ascending } = ordering;
            matched = [...matched].sort((a, b) => {
              const av = String(a[column] ?? "");
              const bv = String(b[column] ?? "");
              return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
            });
          }
          resolve({ data: matched, error: null });
        },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return builder;
        },
        order(column: string, options?: { ascending?: boolean }) {
          ordering = { column, ascending: options?.ascending ?? true };
          return builder;
        },
        async maybeSingle() {
          if (missing.includes(table)) {
            return {
              data: null,
              error: { code: "42P01", message: `relation "public.${table}" does not exist` },
            };
          }
          let matched = rows.filter((row) => filters.every((f) => f(row)));
          if (ordering) {
            const { column, ascending } = ordering;
            matched = [...matched].sort((a, b) => {
              const av = String(a[column] ?? "");
              const bv = String(b[column] ?? "");
              return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
            });
          }
          return { data: matched[0] ?? null, error: null };
        },
        async insert(values: Row) {
          if (missing.includes(table)) {
            return {
              data: null,
              error: { code: "42P01", message: `relation "public.${table}" does not exist` },
            };
          }
          const inserted = { ...values, id: `id-${rows.length + 1}` };
          rows.push(inserted);
          return {
            data: inserted,
            error: null,
            select() {
              return {
                async single() {
                  return { data: inserted, error: null };
                },
              };
            },
          };
        },
      };
      return builder;
    },
  };
}

function shareRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "share-1",
    owner_id: "owner-1",
    resource_type: "chat",
    resource_id: "chat-1",
    token: "a".repeat(43),
    permission: "view",
    expires_at: null,
    revoked: false,
    created_at: "2026-11-22T00:00:00.000Z",
    ...overrides,
  };
}

// Cast through unknown: the fake only implements the builder calls the
// store uses, which is exactly the surface under test.
function asClient(fake: ReturnType<typeof fakeClient>) {
  return fake as unknown as Parameters<typeof findLiveShare>[0];
}

test("findLiveShare returns ok for a live share", async () => {
  const client = asClient(fakeClient({ shares: [shareRow()] }));
  const result = await findLiveShare(client, "a".repeat(43));
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.share.resource_id, "chat-1");
  }
});

test("findLiveShare returns not_found for an unknown token", async () => {
  const client = asClient(fakeClient({ shares: [shareRow()] }));
  const result = await findLiveShare(client, "b".repeat(43));
  assert.equal(result.status, "not_found");
});

test("findLiveShare refuses revoked and expired shares", async () => {
  const revoked = asClient(fakeClient({ shares: [shareRow({ revoked: true })] }));
  assert.equal((await findLiveShare(revoked, "a".repeat(43))).status, "revoked_or_expired");

  const expired = asClient(
    fakeClient({ shares: [shareRow({ expires_at: "2026-11-01T00:00:00.000Z" })] })
  );
  assert.equal((await findLiveShare(expired, "a".repeat(43))).status, "revoked_or_expired");
});

test("findLiveShare returns unavailable when the shares table is missing", async () => {
  const client = asClient(fakeClient({}, ["shares"]));
  const result = await findLiveShare(client, "a".repeat(43));
  assert.equal(result.status, "unavailable");
});

test("listShareComments returns comments oldest first, null when table missing", async () => {
  const comments = [
    { id: "c2", share_id: "share-1", author_user_id: null, author_name: "B", body: "second", created_at: "2026-11-22T01:00:00.000Z" },
    { id: "c1", share_id: "share-1", author_user_id: null, author_name: "A", body: "first", created_at: "2026-11-22T00:00:00.000Z" },
  ];
  const client = asClient(fakeClient({ share_comments: comments }));
  const listed = await listShareComments(client, "share-1");
  assert.deepEqual(listed?.map((c) => c.body), ["first", "second"]);

  const missing = asClient(fakeClient({}, ["share_comments"]));
  assert.equal(await listShareComments(missing, "share-1"), null);
});
