/**
 * Shared generation constants for the build pipeline.
 *
 * The classic /api/build route and the streaming /api/build/stream
 * route must ask the model for exactly the same thing — one definition
 * here prevents the two endpoints from drifting apart.
 */

export const PROJECT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    project: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        framework: { type: "STRING" },
        files: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              path: { type: "STRING" },
              content: { type: "STRING" },
              language: { type: "STRING" },
            },
            required: ["path", "content", "language"],
          },
        },
      },
      required: ["name", "framework", "files"],
    },
  },
  required: ["project"],
} as const;

export const GENERATION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

export const MAX_PROMPT_LENGTH = 20000;

export const SYSTEM_INSTRUCTION = `You are the project generation engine for ANVIX AI.

Your responsibility is to generate a complete, coherent, runnable Next.js application from the user's requirements.

You must think about the application as a real software project.

Generate all required files and ensure imports, file paths, components, styling, and package dependencies are consistent.

The output will be consumed programmatically by ANVIX.

Return ONLY valid JSON.

Never return:
- Markdown
- code fences
- explanations outside JSON
- comments outside JSON

The JSON must follow exactly:

{
  "project": {
    "name": "string",
    "framework": "nextjs",
    "files": [
      {
        "path": "string",
        "content": "string",
        "language": "string"
      }
    ]
  }
}

Important rules:
1. Generate a complete runnable Next.js application.
2. Keep the project reasonably small and coherent.
3. Every imported local file must exist in the output.
4. Do not reference files that were not generated.
5. If a dependency is required, declare it in package.json.
6. Prefer existing/common dependencies.
7. Do not invent unavailable packages.
8. Include the necessary package.json.
9. Include the required app files.
10. Keep TypeScript valid.
11. Keep JSX valid.
12. Keep CSS valid.
13. Avoid unnecessary complexity.
14. Do not use placeholder text such as "implement this later".
15. Do not omit important files required to run the application.
16. The final project should be suitable for npm install followed by npm run build.`;
