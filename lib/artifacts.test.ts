import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSandboxedSrcDoc,
  hasArtifact,
  parseArtifactInfo,
  parseArtifacts,
  MAX_ARTIFACT_CODE_CHARS,
} from "./artifacts.ts";

const HTML_DOC = "<!doctype html><html><body><p>hi</p></body></html>";

test("parseArtifactInfo accepts the canonical artifact:html fence", () => {
  assert.deepEqual(parseArtifactInfo("artifact:html"), {
    language: "html",
    title: undefined,
  });
  assert.deepEqual(parseArtifactInfo('artifact:html title="Calc"'), {
    language: "html",
    title: "Calc",
  });
  assert.deepEqual(parseArtifactInfo("artifact"), {
    language: "html",
    title: undefined,
  });
});

test("parseArtifactInfo accepts the html artifact alias", () => {
  assert.deepEqual(parseArtifactInfo("html artifact"), {
    language: "html",
    title: undefined,
  });
  assert.deepEqual(parseArtifactInfo('html artifact title="Chart"'), {
    language: "html",
    title: "Chart",
  });
});

test("parseArtifactInfo rejects ordinary fences and non-HTML artifacts", () => {
  assert.equal(parseArtifactInfo("html"), null);
  assert.equal(parseArtifactInfo("javascript"), null);
  assert.equal(parseArtifactInfo("artifact:svg"), null);
  assert.equal(parseArtifactInfo("artifact:js"), null);
  assert.equal(parseArtifactInfo(""), null);
});

test("parseArtifacts extracts an artifact and removes it from the text", () => {
  const { text, artifacts } = parseArtifacts(
    `Here is your widget:\n\n\`\`\`artifact:html title="Loan calculator"\n${HTML_DOC}\n\`\`\`\n\nTry it out.`
  );
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].title, "Loan calculator");
  assert.equal(artifacts[0].language, "html");
  assert.equal(artifacts[0].code, HTML_DOC);
  assert.equal(artifacts[0].previewable, true);
  assert.equal(artifacts[0].id, "artifact-0");
  assert.ok(!text.includes("artifact"));
  assert.ok(text.includes("Here is your widget"));
  assert.ok(text.includes("Try it out."));
});

test("parseArtifacts defaults the title and leaves plain code alone", () => {
  const { text, artifacts } = parseArtifacts(
    `Code:\n\n\`\`\`js\nconst x = 1;\n\`\`\`\n\n\`\`\`artifact:html\n${HTML_DOC}\n\`\`\``
  );
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].title, "Interactive artifact 1");
  assert.ok(text.includes("const x = 1;"));
});

test("parseArtifacts caps at 3 artifacts and leaves the rest as code", () => {
  const block = `\`\`\`artifact:html\n${HTML_DOC}\n\`\`\``;
  const { artifacts, text } = parseArtifacts(
    [block, block, block, block].join("\n\n")
  );
  assert.equal(artifacts.length, 3);
  assert.ok(text.includes("artifact:html"));
});

test("parseArtifacts leaves oversized blocks as plain code", () => {
  const big = "x".repeat(MAX_ARTIFACT_CODE_CHARS + 1);
  const { artifacts, text } = parseArtifacts(
    `\`\`\`artifact:html\n${big}\n\`\`\``
  );
  assert.equal(artifacts.length, 0);
  assert.ok(text.includes(big));
});

test("parseArtifacts extracts an interrupted fence as a partial artifact", () => {
  // The reported case: the stream was cut off mid-HTML and the chat
  // appended the interruption note. The raw HTML must not survive
  // in the text (it would render as a code block).
  const partial = "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width, ";
  const { text, artifacts } = parseArtifacts(
    `Here is your widget:\n\n\`\`\`artifact:html title="Tiny Calculator"\n${partial}\n\n[Response interrupted. Please try again.]`
  );
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].title, "Tiny Calculator");
  assert.equal(artifacts[0].code, partial);
  assert.equal(artifacts[0].partial, true);
  assert.ok(!text.includes("<!doctype"));
  assert.ok(!text.includes("artifact"));
  assert.ok(text.includes("Here is your widget"));
  assert.ok(text.includes("[Response interrupted. Please try again.]"));
});

test("parseArtifacts strips an unterminated artifact fence while streaming and flags it as building", () => {
  // Mid-stream the fence is usually just unfinished, not
  // interrupted — but leaving it in the text showed the raw fence
  // and HTML as plain text while it streamed in. The unfinished
  // block is stripped from the visible text and flagged instead, so
  // the bubble can show a neutral "Building…" placeholder; no
  // artifact entry is created, so no card flashes mid-stream.
  const partial = "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width, ";
  const { text, artifacts, buildingArtifact, buildingArtifactTitle } =
    parseArtifacts(
      `Here is your widget:\n\n\`\`\`artifact:html title="Tiny Calculator"\n${partial}`,
      { streaming: true }
    );
  assert.equal(artifacts.length, 0);
  assert.equal(buildingArtifact, true);
  assert.equal(buildingArtifactTitle, "Tiny Calculator");
  assert.ok(!text.includes("artifact:html"));
  assert.ok(!text.includes("<!doctype"));
  assert.ok(text.includes("Here is your widget:"));
});

test("parseArtifacts extracts a complete fence and flags a second unfinished one while streaming", () => {
  const { text, artifacts, buildingArtifact, buildingArtifactTitle } =
    parseArtifacts(
      `First:\n\n\`\`\`artifact:html title="Loan calculator"\n${HTML_DOC}\n\`\`\`\n\nSecond:\n\n\`\`\`artifact:html title="Tiny Calculator"\n<!doctype html><html>`,
      { streaming: true }
    );
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].title, "Loan calculator");
  assert.equal(buildingArtifact, true);
  assert.equal(buildingArtifactTitle, "Tiny Calculator");
  assert.ok(!text.includes("<!doctype"));
  assert.ok(text.includes("First:"));
});

test("parseArtifacts leaves an unterminated non-artifact fence alone while streaming", () => {
  const { text, artifacts, buildingArtifact } = parseArtifacts(
    "Some code:\n\n```js\nconst x = 1;",
    { streaming: true }
  );
  assert.equal(artifacts.length, 0);
  assert.equal(buildingArtifact, undefined);
  assert.ok(text.includes("const x = 1;"));
});

test("parseArtifacts still extracts complete fences while streaming", () => {
  const { text, artifacts } = parseArtifacts(
    `Here is your widget:\n\n\`\`\`artifact:html title="Loan calculator"\n${HTML_DOC}\n\`\`\``,
    { streaming: true }
  );
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].title, "Loan calculator");
  assert.equal(artifacts[0].partial, undefined);
  assert.ok(!text.includes("artifact"));
});

test("parseArtifacts leaves an unterminated non-artifact fence alone", () => {
  const { text, artifacts } = parseArtifacts(
    "Some code:\n\n```js\nconst x = 1;"
  );
  assert.equal(artifacts.length, 0);
  assert.ok(text.includes("const x = 1;"));
});

test("parseArtifacts leaves an oversized interrupted fence as plain code", () => {
  const big = "x".repeat(MAX_ARTIFACT_CODE_CHARS + 1);
  const { artifacts, text } = parseArtifacts(
    `\`\`\`artifact:html\n${big}`
  );
  assert.equal(artifacts.length, 0);
  assert.ok(text.includes(big));
});

test("hasArtifact is true only for renderable artifact blocks", () => {
  assert.equal(hasArtifact(`\`\`\`artifact:html\n${HTML_DOC}\n\`\`\``), true);
  assert.equal(hasArtifact(`\`\`\`artifact:svg\n<svg/>\n\`\`\``), false);
  assert.equal(hasArtifact("plain text"), false);
});

test("buildSandboxedSrcDoc injects a network-blocking CSP after <head>", () => {
  const doc = buildSandboxedSrcDoc(
    "<!doctype html><html><head><title>t</title></head><body>x</body></html>"
  );
  assert.ok(doc.includes("Content-Security-Policy"));
  assert.ok(doc.includes("connect-src 'none'"));
  assert.ok(doc.includes("default-src 'none'"));
  assert.ok(doc.indexOf("<head>") < doc.indexOf("Content-Security-Policy"));
  assert.ok(doc.includes("<title>t</title>"));
});

test("buildSandboxedSrcDoc prepends the CSP when there is no <head>", () => {
  const doc = buildSandboxedSrcDoc("<p>fragment</p>");
  assert.ok(doc.startsWith("<meta http-equiv="));
  assert.ok(doc.includes("<p>fragment</p>"));
});

test("buildSandboxedSrcDoc keeps inline scripts usable but blocks fetches", () => {
  const doc = buildSandboxedSrcDoc(
    "<html><body><script>document.title='x'</script></body></html>"
  );
  assert.ok(doc.includes("script-src 'unsafe-inline'"));
  assert.ok(doc.includes("document.title='x'"));
});
