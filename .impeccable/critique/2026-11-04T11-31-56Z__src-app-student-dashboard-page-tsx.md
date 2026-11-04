---
target: student dashboard
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(student)\\dashboard\\page.tsx"
target_fingerprint: "sha256:79915449aa07aa8e3c643e026df2b59db649b6932370acd0f24348b94b181975"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(student)\\dashboard\\page.tsx"
timestamp: 2026-11-04T11-31-56Z
slug: src-app-student-dashboard-page-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)
Target: student dashboard (src/app/(student)/dashboard/page.tsx). Heuristics 26/40 (1:3 2:3 3:2 4:2 5:3 6:3 7:2 8:2 9:3 10:3).
Specificity: greeting fact + one action is product-specific; below it seven equal-weight bordered sections 40px apart read generic.
Detector: clean (only Inter-100% advisory, by design). Browser: no overflow; sections uniformly 40px apart; sub-44px targets: sm task buttons (36px), section header links (21px), footer links, header logo.
Priority issues:
[P1] "Closing this week" only counts tracked items: a qualifying, unsaved listing closing in 2 days appears only in Recommended (dashboard.ts:37-41, page.tsx:94).
[P1] Flat, repetitive hierarchy: the same scholarship in fact, Closing this week, Next steps, alerts; all sections same heading/box/gap (page.tsx:27,110). Fix: merge/dedupe, act-now vs FYI bands (32 within, 48 between), cap next steps at 3.
[P2] Off-scale spacing: gap-10 (40), mt-5 (20), sm:px-5/sm:p-5 (20), gap-1.5 (6), mt-0.5 (2) on page.tsx and card.tsx.
[P2] Banned patterns: tinted icon circles per Next-steps row (page.tsx:17-21,172); number-over-label strip in My applications (page.tsx:211-223), "2 of 10 documents" sums across scholarships.
[P2] Section h2 is 18px on desktop (spec 20): page.tsx:27 lacks sm:text-title; token names shifted vs DESIGN.md (title-sm=18, title=20).
[P2] Touch targets under 44px at 360px (task buttons, section links).
Minor: alert titles underlined vs announcements plain; profile h2 14px; vague "View"/"Answer" labels; unverified tasks outrank real document work; duplicate step=1/step=3 CTAs for the same missing answer.
