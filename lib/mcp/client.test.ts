import test from "node:test";
import assert from "node:assert/strict";
import {
  GITHUB_MCP_SERVER_URL,
  isAllowedMcpServerUrl,
  listRemoteMcpTools,
} from "./client.ts";

test("only GitHub's MCP server host is allow-listed, https only", () => {
  assert.equal(isAllowedMcpServerUrl(GITHUB_MCP_SERVER_URL), true);
  assert.equal(
    isAllowedMcpServerUrl("https://api.githubcopilot.com/mcp/"),
    true
  );
  assert.equal(
    isAllowedMcpServerUrl("http://api.githubcopilot.com/mcp/"),
    false
  );
  assert.equal(isAllowedMcpServerUrl("https://evil.example.com/mcp"), false);
  assert.equal(isAllowedMcpServerUrl("https://github.com/mcp"), false);
  assert.equal(isAllowedMcpServerUrl("not a url"), false);
});

test("listRemoteMcpTools refuses a non-allow-listed server without network", async () => {
  const result = await listRemoteMcpTools("https://evil.example.com/mcp");
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error, /not allow-listed/);
  }
});
