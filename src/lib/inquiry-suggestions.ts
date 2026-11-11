import type { ScholarshipDetail } from "@/lib/data/scholarships";
import { formatDate } from "@/lib/format";
import { submissionSummary } from "@/components/scholarship/where-to-submit";

export type ListingAnswer = { question: string; answer: string; href: string };

export function listingAnswers(s: ScholarshipDetail, query = ""): ListingAnswer[] {
  const submission = submissionSummary(s);
  const submissionAnswer = submission
    ? [
        s.submission_method === "online" && s.submission_url ? `Apply online at ${s.submission_url}` : `Submit your application ${s.submission_method ? submission.charAt(0).toLowerCase() + submission.slice(1) : `at ${submission}`}.`,
        s.submission_address ? `The address is ${s.submission_address}.` : "",
        s.submission_hours ? `Submission hours are ${s.submission_hours}.` : "",
      ].filter(Boolean).join("\n")
    : "";
  const rules = [
    { question: "When is the deadline?", keywords: /deadline|when.*(close|apply)|closing|due date/i, answer: s.closes_on ? `The application deadline is ${formatDate(s.closes_on, true)}.` : "" },
    { question: "What is the scholarship amount?", keywords: /amount|allowance|money|benefit|how much|stipend/i, answer: s.amount_text ? `The award is listed as ${s.amount_text}.` : "" },
    { question: "Which documents should I prepare?", keywords: /document|requirement|paper|certificate|cor\b/i, answer: s.documents.length ? `Prepare these documents.\n${s.documents.map((doc) => `• ${doc.name}`).join("\n")}` : "" },
    { question: "Where do I submit my application?", keywords: /where|submit|apply|office|address|online/i, answer: submissionAnswer },
    { question: "How do I apply?", keywords: /how.*apply|step|process|procedure/i, answer: s.steps.length ? s.steps.map((step, i) => `${i + 1}. ${step.title}${step.detail ? `: ${step.detail}` : ""}`).join("\n") : "" },
  ];
  return rules.filter((rule) => rule.answer && (!query.trim() || rule.keywords.test(query)))
    .map((rule) => ({ question: rule.question, answer: rule.answer.replace(/[ \t]*\(sample\)/gi, ""), href: `/s/${s.slug}` }));
}
