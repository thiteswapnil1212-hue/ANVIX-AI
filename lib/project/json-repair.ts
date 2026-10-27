/**
 * Deterministic repair for the comma mistakes models make most often in
 * JSON files: a stray extra comma (`{"a":1,, "b":2}`) or a trailing comma
 * before a closing bracket (`{"a":1,}`).
 *
 * The repair is deliberately narrow and semantics-preserving: it only
 * drops a comma that sits OUTSIDE a string literal and is followed
 * (ignoring whitespace) by `}`, `]` or another `,`. Such a comma can
 * never be valid JSON, and removing it cannot change the parsed value.
 * Commas inside string literals are never touched.
 *
 * Returns the repaired text, or null when the text still does not parse
 * afterwards — callers keep the original "not valid JSON" error then.
 */
export function repairJsonText(text: string): string | null {
  let repaired = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      repaired += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      repaired += char;
      continue;
    }

    if (char === ",") {
      let nextIndex = index + 1;
      while (nextIndex < text.length && /\s/.test(text[nextIndex])) {
        nextIndex += 1;
      }
      const next = text[nextIndex];
      if (next === "}" || next === "]" || next === ",") {
        continue;
      }
      repaired += char;
      continue;
    }

    repaired += char;
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

/** Parse JSON, falling back to the comma repair when the first parse fails. */
export function parseJsonWithRepair(
  text: string
): { value: unknown; repaired: boolean } | null {
  try {
    return { value: JSON.parse(text), repaired: false };
  } catch {
    // Fall through to the repair attempt below.
  }

  const repaired = repairJsonText(text);
  if (repaired === null) {
    return null;
  }

  try {
    return { value: JSON.parse(repaired), repaired: true };
  } catch {
    return null;
  }
}
