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
