import test from "node:test";
import assert from "node:assert/strict";

import {
  PROMPT_TEMPLATES,
  PROMPT_TEMPLATE_CATEGORIES,
  fillPromptTemplate,
  getPromptTemplate,
  promptPlaceholders,
  searchPromptTemplates,
  templatesForCategory,
} from "./prompt-templates.ts";

test("prompt template library: ids unique, categories valid, placeholders declared", () => {
  const ids = new Set<string>();
  for (const template of PROMPT_TEMPLATES) {
    assert.ok(template.id, "template needs an id");
    assert.ok(!ids.has(template.id), `duplicate template id ${template.id}`);
    ids.add(template.id);

    assert.ok(
      PROMPT_TEMPLATE_CATEGORIES.some((c) => c.id === template.category),
      `unknown category ${template.category} on ${template.id}`
    );
    assert.ok(template.title.trim(), `${template.id} needs a title`);
    assert.ok(
      template.description.trim(),
      `${template.id} needs a description`
    );
    assert.ok(template.prompt.trim(), `${template.id} needs a prompt`);

    // Every placeholder in the prompt must be declared, and vice versa.
    const inPrompt = promptPlaceholders(template.prompt);
    assert.deepEqual(
      [...template.placeholders].sort(),
      [...inPrompt].sort(),
      `${template.id}: declared placeholders must match the prompt`
    );
    assert.ok(
      inPrompt.length > 0,
      `${template.id} should have at least one placeholder`
    );
  }

  // The library covers the app's student audience.
  assert.ok(PROMPT_TEMPLATES.length >= 12);
  for (const category of PROMPT_TEMPLATE_CATEGORIES) {
    assert.ok(
      templatesForCategory(category.id).length >= 1,
      `category ${category.id} has no templates`
    );
  }
});

test("fillPromptTemplate fills given values and leaves the rest visible", () => {
  const template = getPromptTemplate("cold-email");
  assert.ok(template);

  const filled = fillPromptTemplate(template.prompt, {
    recipient: "Priya Sharma",
    company: "Acme Corp",
  });
  assert.ok(filled.includes("Priya Sharma"));
  assert.ok(filled.includes("Acme Corp"));
  // Unfilled placeholders stay in the text for the user to edit.
  assert.ok(filled.includes("{{opportunity}}"));
  assert.ok(filled.includes("{{field}}"));

  // Blank values do not erase the placeholder.
  assert.ok(
    fillPromptTemplate("Hi {{name}}", { name: "   " }).includes(
      "{{name}}"
    )
  );
  assert.equal(fillPromptTemplate("Hi {{name}}", { name: "Asha" }), "Hi Asha");
});

test("searchPromptTemplates matches title, description and prompt text", () => {
  assert.ok(
    searchPromptTemplates("cold email").some((t) => t.id === "cold-email")
  );
  assert.ok(
    searchPromptTemplates("DSA").some((t) => t.id === "dsa-practice")
  );
  assert.ok(
    searchPromptTemplates("landing page").some(
      (t) => t.id === "landing-page"
    )
  );
  assert.equal(searchPromptTemplates("").length, PROMPT_TEMPLATES.length);
  assert.deepEqual(searchPromptTemplates("zzz-no-such-template"), []);
  assert.equal(getPromptTemplate("no-such-template"), undefined);
});
