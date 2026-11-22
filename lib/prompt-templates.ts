/**
 * Prompt-template library — static, no backend.
 *
 * A curated set of ready prompts a student can start from with one tap.
 * Templates are honest and generic: they contain no fake claims about
 * ANVIX, no invented results, and no company-specific promises.
 * Placeholders use {{name}} and are left in place when the user has not
 * filled them, so the user always sees (and edits) what will be sent.
 */

export type PromptTemplateCategory =
  | "interview"
  | "resume"
  | "code"
  | "study"
  | "writing"
  | "build";

export interface PromptTemplate {
  id: string;
  title: string;
  category: PromptTemplateCategory;
  /** One-line description shown in the picker. */
  description: string;
  /** The prompt text, with {{placeholders}} the user fills in. */
  prompt: string;
  /** Placeholder names, in the order they appear in the prompt. */
  placeholders: string[];
}

export const PROMPT_TEMPLATE_CATEGORIES: {
  id: PromptTemplateCategory;
  label: string;
  hint: string;
}[] = [
  {
    id: "interview",
    label: "Interview & DSA",
    hint: "Practice questions, mock interviews and explanations.",
  },
  {
    id: "resume",
    label: "Resume & Jobs",
    hint: "Resumes, cold emails and job applications.",
  },
  {
    id: "code",
    label: "Code",
    hint: "Explain, debug and review code.",
  },
  {
    id: "study",
    label: "Study",
    hint: "Learn a topic, revise, and test yourself.",
  },
  {
    id: "writing",
    label: "Writing",
    hint: "Emails, messages and everyday writing.",
  },
  {
    id: "build",
    label: "Build",
    hint: "Describe something to build or design.",
  },
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ---------------------------------------------------------- interview
  {
    id: "dsa-practice",
    title: "Practise a DSA topic",
    category: "interview",
    description: "Get a graded practice question on any DSA topic.",
    prompt:
      "Give me one {{topic}} practice question at {{difficulty}} difficulty, like the ones asked in coding interviews. First give only the problem statement and constraints, then wait for my solution before giving hints.",
    placeholders: ["topic", "difficulty"],
  },
  {
    id: "mock-interview-question",
    title: "Mock interview question",
    category: "interview",
    description: "Ask me one interview question, then give feedback.",
    prompt:
      "Act as an interviewer for a {{role}} role. Ask me one interview question about {{topic}}. After I answer, point out what was good and what to improve, in 3 short bullet points.",
    placeholders: ["role", "topic"],
  },
  {
    id: "explain-interview-answer",
    title: "Explain an interview answer",
    category: "interview",
    description: "Learn how to answer a common interview question.",
    prompt:
      "Explain how to answer the interview question: '{{question}}'. Give a short structure I can follow, one example answer for a second-year student with no work experience, and one common mistake to avoid.",
    placeholders: ["question"],
  },
  {
    id: "aptitude-practice",
    title: "Aptitude practice set",
    category: "interview",
    description: "A short aptitude set with answers explained.",
    prompt:
      "Give me 5 aptitude practice questions on {{topic}} with four options each. After I answer, explain each solution step by step.",
    placeholders: ["topic"],
  },
  // ------------------------------------------------------------ resume
  {
    id: "cold-email",
    title: "Write a cold email",
    category: "resume",
    description: "A short, polite outreach email for an opportunity.",
    prompt:
      "Write a short cold email (under 120 words) to {{recipient}} at {{company}} asking about {{opportunity}}. I am a second-year {{field}} student. Keep it polite, specific, and human — no exaggerated claims about my experience.",
    placeholders: ["recipient", "company", "opportunity", "field"],
  },
  {
    id: "resume-bullets",
    title: "Improve resume bullets",
    category: "resume",
    description: "Turn plain project lines into strong resume bullets.",
    prompt:
      "Rewrite these resume bullet points to be stronger and more specific, using action verbs and numbers where the facts support them. Do not invent results, metrics or technologies I did not mention. Here are my bullets:\n\n{{bullets}}",
    placeholders: ["bullets"],
  },
  {
    id: "resume-review",
    title: "Review my resume",
    category: "resume",
    description: "A checklist review of a resume draft.",
    prompt:
      "Review my resume below as a recruiter would for an internship. List: (1) the 3 strongest points, (2) the 3 biggest gaps or unclear parts, (3) 3 concrete edits I can make today. Do not invent experience I do not have.\n\n{{resume}}",
    placeholders: ["resume"],
  },
  {
    id: "linkedin-about",
    title: "Draft a LinkedIn About section",
    category: "resume",
    description: "A short About section based only on real facts.",
    prompt:
      "Draft a short LinkedIn About section (under 100 words) for a second-year {{field}} student who is learning {{skills}} and building {{project}}. Use only the facts I gave you — do not add jobs, awards or results I did not mention.",
    placeholders: ["field", "skills", "project"],
  },
  // ---------------------------------------------------------------- code
  {
    id: "explain-code",
    title: "Explain this code",
    category: "code",
    description: "A plain-language explanation of a code snippet.",
    prompt:
      "Explain this code in simple language, line by line where it matters. Then say what it does overall, and name one edge case where it could fail.\n\n```\n{{code}}\n```",
    placeholders: ["code"],
  },
  {
    id: "debug-code",
    title: "Debug my code",
    category: "code",
    description: "Find the bug and explain the fix.",
    prompt:
      "This code is not working as expected. The problem I see is: {{problem}}. Find the likely bug, explain why it happens in plain language, and show the corrected code with the change highlighted.\n\n```\n{{code}}\n```",
    placeholders: ["problem", "code"],
  },
  {
    id: "review-code",
    title: "Review my code",
    category: "code",
    description: "A short, practical code review.",
    prompt:
      "Review this code as a senior developer would. List: (1) bugs or correctness issues, (2) readability improvements, (3) one thing that is already done well. Keep it short and concrete.\n\n```\n{{code}}\n```",
    placeholders: ["code"],
  },
  // --------------------------------------------------------------- study
  {
    id: "explain-topic",
    title: "Explain a topic simply",
    category: "study",
    description: "A clear explanation with an example and a check.",
    prompt:
      "Explain {{topic}} to me like I am a second-year student seeing it for the first time. Use one everyday analogy, one worked example, and finish with 2 questions I can use to test myself.",
    placeholders: ["topic"],
  },
  {
    id: "study-plan",
    title: "Make a study plan",
    category: "study",
    description: "A realistic plan for an exam or deadline.",
    prompt:
      "Make a realistic study plan for {{exam}} in {{days}} days. I can study about {{hours_per_day}} hours a day. Break it into daily tasks, put revision at the end, and keep each day's workload achievable.",
    placeholders: ["exam", "days", "hours_per_day"],
  },
  {
    id: "summarise-notes",
    title: "Summarise my notes",
    category: "study",
    description: "Turn long notes into a short revision summary.",
    prompt:
      "Summarise these notes into a short revision summary: key definitions, the 5 most important points, and anything that looks like an exam question. Do not add facts that are not in the notes.\n\n{{notes}}",
    placeholders: ["notes"],
  },
  // ------------------------------------------------------------- writing
  {
    id: "professional-email",
    title: "Write a professional email",
    category: "writing",
    description: "A polite email for college, work or applications.",
    prompt:
      "Write a polite, professional email to {{recipient}} about {{subject}}. The key points are: {{points}}. Keep it under 150 words, with a clear subject line and a proper closing.",
    placeholders: ["recipient", "subject", "points"],
  },
  {
    id: "fix-writing",
    title: "Fix my writing",
    category: "writing",
    description: "Correct grammar and tone without changing meaning.",
    prompt:
      "Correct the grammar and improve the tone of the text below, keeping my meaning and facts exactly the same. Show the corrected version, then list the 3 most important changes you made.\n\n{{text}}",
    placeholders: ["text"],
  },
  // --------------------------------------------------------------- build
  {
    id: "landing-page",
    title: "Build a landing page for X",
    category: "build",
    description: "Describe a landing page and get a build plan.",
    prompt:
      "Help me build a landing page for {{product}}. The audience is {{audience}} and the one action I want visitors to take is {{action}}. First outline the sections and the copy for each, then ask me what to change before building it.",
    placeholders: ["product", "audience", "action"],
  },
  {
    id: "project-idea",
    title: "Plan a project idea",
    category: "build",
    description: "Turn an idea into a buildable project plan.",
    prompt:
      "Turn this project idea into a buildable plan: {{idea}}. Give me: the core feature (just one), the simplest tech approach, the data I will need, and the first 3 steps. Keep the scope small enough for one student to build in a week.",
    placeholders: ["idea"],
  },
];

export function getPromptTemplate(
  id: string
): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((template) => template.id === id);
}

export function templatesForCategory(
  category: PromptTemplateCategory
): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(
    (template) => template.category === category
  );
}

/** Case-insensitive search over title, description and prompt text. */
export function searchPromptTemplates(query: string): PromptTemplate[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return PROMPT_TEMPLATES;
  return PROMPT_TEMPLATES.filter((template) =>
    [template.title, template.description, template.prompt]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

const PLACEHOLDER_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/** All placeholder names in a prompt, in first-appearance order. */
export function promptPlaceholders(prompt: string): string[] {
  const seen: string[] = [];
  for (const match of prompt.matchAll(PLACEHOLDER_PATTERN)) {
    if (!seen.includes(match[1])) seen.push(match[1]);
  }
  return seen;
}

/**
 * Fill {{placeholders}} with the given values. A placeholder with no
 * value (or a blank value) is left in place, so the user can see and
 * fill it in the composer before sending.
 */
export function fillPromptTemplate(
  prompt: string,
  values: Record<string, string>
): string {
  return prompt.replace(PLACEHOLDER_PATTERN, (whole, name: string) => {
    const value = values[name]?.trim();
    return value ? value : whole;
  });
}
