import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAnvixMcpServer } from "./server.ts";

async function linkedClient() {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createAnvixMcpServer({
    userId: "user-1",
    getCalendarAccessToken: async () => null,
    chatImpl: async (prompt) => `echo: ${prompt}`,
  });
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

test("MCP server lists the three ANVIX tools", async () => {
  const client = await linkedClient();
  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "anvix_calendar_create",
    "anvix_calendar_today",
    "anvix_chat",
  ]);
  await client.close();
});

test("anvix_chat returns the assistant answer", async () => {
  const client = await linkedClient();
  const result = await client.callTool({
    name: "anvix_chat",
    arguments: { prompt: "hello" },
  });
  const content = result.content as { type: string; text: string }[];
  assert.equal(content[0]?.text, "echo: hello");
  assert.equal(result.isError, undefined);
  await client.close();
});

test("anvix_calendar_today fails honestly when Calendar is not connected", async () => {
  const client = await linkedClient();
  const result = await client.callTool({
    name: "anvix_calendar_today",
    arguments: {},
  });
  assert.equal(result.isError, true);
  const content = result.content as { type: string; text: string }[];
  assert.match(content[0]?.text ?? "", /not connected/);
  await client.close();
});

test("anvix_calendar_create fails honestly when Calendar is not connected", async () => {
  const client = await linkedClient();
  const result = await client.callTool({
    name: "anvix_calendar_create",
    arguments: {
      summary: "Test",
      startIso: "2026-11-23T10:00:00+05:30",
      endIso: "2026-11-23T11:00:00+05:30",
    },
  });
  assert.equal(result.isError, true);
  await client.close();
});
