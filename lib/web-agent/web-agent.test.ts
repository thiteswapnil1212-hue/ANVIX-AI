import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { isWebAgentAvailable } from "./availability.ts";
import {
  approvalDescriptionFor,
  approvalTitleFor,
  requestApproval,
  resolveApproval,
  stepNeedsApproval,
} from "./approvals.ts";
import { isAllowedWebUrl, validateWebPlan } from "./planner.ts";
import { isAllowedWebUrl as isAllowedWebUrlFromLeaf } from "./urls.ts";
import { isPrivateOrReservedIp } from "./urls.ts";
import type { WebStep } from "./types.ts";

test("allowed URLs are public http(s) pages only", () => {
  assert.equal(isAllowedWebUrl("https://example.com"), true);
  assert.equal(isAllowedWebUrl("http://example.com/page?q=1"), true);
  assert.equal(isAllowedWebUrl("file:///etc/passwd"), false);
  assert.equal(isAllowedWebUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedWebUrl("http://localhost:3000"), false);
  assert.equal(isAllowedWebUrl("http://127.0.0.1:8080"), false);
  assert.equal(isAllowedWebUrl("http://192.168.1.10"), false);
  assert.equal(isAllowedWebUrl("http://10.0.0.5"), false);
  assert.equal(isAllowedWebUrl("https://user:pass@example.com"), false);
  assert.equal(isAllowedWebUrl("not a url"), false);
  assert.equal(isAllowedWebUrl(""), false);
  assert.equal(isAllowedWebUrl(undefined), false);
});

test("SSRF: non-decimal / short / integer IPv4 forms are blocked", () => {
  // WHATWG URL normalises these to dotted decimal; the numeric range
  // checks must catch every one of them.
  const blocked = [
    "http://0x7f000001/", // hex 127.0.0.1
    "http://0x7f.1/", // hex + short
    "http://2130706433/", // decimal 127.0.0.1
    "http://0177.0.0.1/", // octal 127.0.0.1
    "http://0177.0.0.01/", // octal, trailing zero
    "http://127.1/", // short 127.0.0.1
    "http://127.0.1/", // short 127.0.0.1
    "http://3232235521/", // decimal 192.168.0.1
    "http://192.168.257/", // overflow part -> 192.168.1.1
    "http://0/", // -> 0.0.0.0
    "http://0.0.0.0/",
    "http://0.1.2.3/", // 0.0.0.0/8
    "http://%31%32%37.0.0.1/", // percent-encoded 127.0.0.1
    "http://100.64.0.1/", // CGNAT
    "http://192.0.2.1/", // TEST-NET-1
    "http://198.18.0.1/", // benchmarking
    "http://198.51.100.1/", // TEST-NET-2
    "http://203.0.113.1/", // TEST-NET-3
    "http://224.0.0.1/", // multicast
    "http://240.0.0.1/", // reserved
    "http://192.0.0.1/", // IETF assignments
  ];
  for (const url of blocked) {
    assert.equal(isAllowedWebUrlFromLeaf(url), false, url);
    assert.equal(isAllowedWebUrl(url), false, `planner: ${url}`);
  }
});

test("SSRF: trailing-dot and local-suffix hostnames are blocked", () => {
  const blocked = [
    "http://localhost./",
    "http://LOCALHOST./",
    "http://ｌｏｃａｌｈｏｓｔ/", // fullwidth — IDNA normalises to localhost
    "http://localhost%2e/",
    "http://sub.localhost/",
    "http://foo.local/",
    "http://foo.internal/",
    "http://foo.intranet/",
    "http://foo.lan/",
    "http://intranet/", // dotless — only resolvable via a local search domain
    "http://fileserver/",
  ];
  for (const url of blocked) {
    assert.equal(isAllowedWebUrlFromLeaf(url), false, url);
  }
  // A trailing dot on a real public domain is harmless and stays allowed.
  assert.equal(isAllowedWebUrlFromLeaf("http://example.com./"), true);
  assert.equal(isAllowedWebUrlFromLeaf("https://example.com:8080/page"), true);
});

test("SSRF: IPv6-mapped and embedded-IPv4 forms are blocked", () => {
  const blocked = [
    "http://[::ffff:127.0.0.1]/", // IPv4-mapped loopback
    "http://[::ffff:7f00:1]/", // same, hex groups
    "http://[::ffff:7f00:0001]/",
    "http://[0:0:0:0:0:ffff:127.0.0.1]/", // uncompressed mapped form
    "http://[::ffff:0:127.0.0.1]/",
    "http://[::ffff:0a00:0001]/", // mapped 10.0.0.1
    "http://[::ffff:a00:1]/",
    "http://[::1]/", // loopback
    "http://[::]/", // unspecified
    "http://[fe80::1]/", // link-local
    "http://[FE80::1]/", // uppercase hex
    "http://[fc00::1]/", // unique-local
    "http://[fd00::1]/",
    "http://[ff02::1]/", // multicast
    "http://[::127.0.0.1]/", // IPv4-compatible loopback
    "http://[::7f00:1]/",
    "http://[64:ff9b::127.0.0.1]/", // NAT64 well-known prefix
    "http://[64:ff9b::c000:201]/", // NAT64 -> 192.0.2.1
    "http://[64:ff9b:1::c000:0201]/", // NAT64 local-use -> 192.0.2.1
    "http://[2002:7f00:1::]/", // 6to4 -> 127.0.0.1
    "http://[2001::7f00:1]/", // Teredo
    "http://[2001:db8::1]/", // documentation
  ];
  for (const url of blocked) {
    assert.equal(isAllowedWebUrlFromLeaf(url), false, url);
    assert.equal(isAllowedWebUrl(url), false, `planner: ${url}`);
  }
  // Genuinely public IPv6 stays allowed.
  assert.equal(isAllowedWebUrlFromLeaf("http://[2606:4700:4700::1111]/"), true);
  assert.equal(isAllowedWebUrlFromLeaf("http://[2001:4860:4860::8888]/"), true);
});

test("SSRF: isPrivateOrReservedIp judges raw literals, fail-closed", () => {
  assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("0x7f000001"), true);
  assert.equal(isPrivateOrReservedIp("2130706433"), true);
  assert.equal(isPrivateOrReservedIp("10.0.0.5"), true);
  assert.equal(isPrivateOrReservedIp("::ffff:7f00:1"), true);
  assert.equal(isPrivateOrReservedIp("[::ffff:127.0.0.1]"), true);
  assert.equal(isPrivateOrReservedIp("fe80::1"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("93.184.216.34"), false);
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false);
  assert.equal(isPrivateOrReservedIp("[2001:4860:4860::8888]"), false);
  assert.equal(isPrivateOrReservedIp("example.com"), false);
  assert.equal(isPrivateOrReservedIp("not-an-ip:::"), true);
  assert.equal(isPrivateOrReservedIp(""), true);
});

test("a valid plan passes validation", () => {
  const plan = validateWebPlan({
    message: "Open example.com and read it.",
    steps: [
      { tool: "navigate", input: { url: "https://example.com" } },
      { tool: "read_page", input: {} },
      { tool: "report", input: { note: "Done." } },
    ],
  });

  assert.equal(plan.steps.length, 3);
  assert.equal(plan.steps[0]?.tool, "navigate");
});

test("flat steps without an input wrapper are accepted", () => {
  const plan = validateWebPlan({
    message: "Open it.",
    steps: [{ tool: "navigate", url: "https://example.com" }],
  });

  assert.equal(plan.steps[0]?.input.url, "https://example.com");
});

test("plans with shell tools are rejected", () => {
  assert.throws(
    () =>
      validateWebPlan({
        message: "Run something.",
        steps: [{ tool: "exec", input: { command: "ls" } }],
      }),
    /unsupported tool/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "Sneaky.",
        steps: [
          {
            tool: "navigate",
            input: { url: "https://example.com", exec: "rm -rf /" },
          },
        ],
      }),
    /forbidden action/
  );
});

test("plans are rejected for bad URLs, password fields, and too many steps", () => {
  assert.throws(
    () =>
      validateWebPlan({
        message: "Bad URL.",
        steps: [{ tool: "navigate", input: { url: "http://localhost:3000" } }],
      }),
    /blocked or invalid URL/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "Password.",
        steps: [
          {
            tool: "type",
            input: { selector: "input[type=password]", text: "secret" },
          },
        ],
      }),
    /password field/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "Too long.",
        steps: Array.from({ length: 11 }, () => ({
          tool: "wait",
          input: { ms: 100 },
        })),
      }),
    /too many steps/
  );

  assert.throws(
    () =>
      validateWebPlan({
        message: "No steps.",
        steps: [],
      }),
    /no steps/
  );
});

test("wait steps cap at 10 seconds", () => {
  assert.throws(
    () =>
      validateWebPlan({
        message: "Long wait.",
        steps: [{ tool: "wait", input: { ms: 60_000 } }],
      }),
    /ms between 0 and 10000/
  );
});

test("risky clicks always need approval, even without the flag", () => {
  const sendStep: WebStep = {
    tool: "click",
    input: { selector: "button[type=submit]" },
  };
  const readStep: WebStep = { tool: "read_page", input: {} };
  const flaggedStep: WebStep = {
    tool: "navigate",
    input: { url: "https://example.com" },
    requiresApproval: true,
  };

  assert.equal(stepNeedsApproval(sendStep), true);
  assert.equal(stepNeedsApproval(readStep), false);
  assert.equal(stepNeedsApproval(flaggedStep), true);
  assert.match(approvalTitleFor(sendStep, 2), /Step 3/);
  assert.match(approvalDescriptionFor(sendStep), /Approve only/);
});

test("approval requests resolve, expire unknown ids, and time out", async () => {
  const request = {
    id: "approval-1",
    runId: "run-1",
    stepIndex: 0,
    title: "Step 1: Click",
    description: "Approve?",
  };

  const pending = requestApproval(request, 50);
  assert.equal(resolveApproval("run-1", "nope", "allowed"), false);
  assert.equal(resolveApproval("run-1", "approval-1", "denied"), true);
  assert.equal(await pending, "denied");

  const timedOut = requestApproval({ ...request, id: "approval-2" }, 50);
  assert.equal(await timedOut, "timeout");
  assert.equal(resolveApproval("run-1", "approval-2", "allowed"), false);
});

test("availability leaf answers 503-honestly on Vercel without playwright", () => {
  // availability.ts / urls.ts import only node builtins — this test
  // must pass with playwright uninstalled (the regression the 500
  // fix protects: the guard used to live behind the playwright import).
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const result = isWebAgentAvailable();
    assert.equal(result.available, false);
    assert.match(
      result.reason ?? "",
      /runs on your own computer — it is not available on the hosted deployment/
    );
  } finally {
    if (previous === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previous;
    }
  }

  assert.equal(isWebAgentAvailable().available, true);
  assert.equal(isAllowedWebUrlFromLeaf("https://example.com"), true);
  assert.equal(isAllowedWebUrlFromLeaf("http://localhost:3000"), false);
});

test("task routes statically import leaves only — no runner/planner/browser", () => {
  // A static import of the runner (or planner/browser) would drag the
  // playwright chain back into the route module load path on Vercel.
  // Dynamic `await import(...)` lines are fine — only static `import`
  // lines are checked.
  const staticImport =
    /^\s*import\s+[^;]*from\s+["']@\/lib\/web-agent\/(runner|planner|browser)["']/m;
  for (const route of [
    "../../app/api/web-agent/route.ts",
    "../../app/api/web-agent/stream/route.ts",
  ]) {
    const source = readFileSync(new URL(route, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      staticImport,
      `${route} must not statically import runner/planner/browser`
    );
  }
});
