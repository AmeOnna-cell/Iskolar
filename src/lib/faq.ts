// FAQ answers are plain text with simple links: [text](/path) or [text](https://…).
// Anything else that looks like a link stays text, so an answer can't carry javascript: URLs.

export type AnswerPart = string | { text: string; href: string };

const LINK = /\[([^\]\n]{1,200})\]\(((?:\/(?!\/)|https:\/\/)[^\s)]{0,500})\)/g;

export function answerParts(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const m of answer.matchAll(LINK)) {
    if (m.index > last) parts.push(answer.slice(last, m.index));
    parts.push({ text: m[1]!, href: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < answer.length) parts.push(answer.slice(last));
  return parts;
}

/** "grades, Average , ,grado" → ["grades", "average", "grado"] (deduplicated, at most 30). */
export function parseKeywords(raw: string): string[] {
  return [...new Set(raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
}

export const FAQ_STATUS = {
  draft: ["Draft", "neutral"],
  approved: ["Approved", "ok"],
  archived: ["Archived", "neutral"],
} as const;
export type FaqStatus = keyof typeof FAQ_STATUS;
