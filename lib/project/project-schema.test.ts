import test from "node:test";
import assert from "node:assert/strict";

import {
  validateGeneratedProject,
  normalizeGeneratedProject,
} from "./project-schema.ts";

test("validateGeneratedProject accepts valid Next.js project payloads", () => {
  const payload = {
    project: {
      name: "demo-app",
      framework: "nextjs",
      files: [
        {
          path: "package.json",
          content: '{"name":"demo-app"}',
          language: "json",
        },
        {
          path: "app/layout.tsx",
          content: "export default function Layout() { return <html />; }",
          language: "tsx",
        },
        {
          path: "app/page.tsx",
          content: "export default function Page() { return <main>Hello</main>; }",
          language: "tsx",
        },
        {
          path: "app/globals.css",
          content: "body { margin: 0; }",
          language: "css",
        },
      ],
    },
  };

  const project = validateGeneratedProject(payload);

  assert.equal(project.name, "demo-app");
  assert.equal(project.framework, "nextjs");
  assert.equal(project.files.length, 4);
});

test("validateGeneratedProject rejects malformed or missing required files", () => {
  const malformed = {
    project: {
      name: "broken-app",
      framework: "nextjs",
      files: [
        {
          path: "app/page.tsx",
          content: "export default function Page() {}",
          language: "tsx",
        },
      ],
    },
  };

  assert.throws(() => validateGeneratedProject(malformed), /missing required file/i);

  const normalized = normalizeGeneratedProject({
    name: "  demo  ",
    framework: "nextjs",
    files: [
      {
        path: "app/page.tsx",
        content: "export default function Page() {}",
        language: "tsx",
      },
    ],
  });

  assert.equal(normalized?.name, "demo");
});
