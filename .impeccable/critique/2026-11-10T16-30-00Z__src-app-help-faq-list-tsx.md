---
target: FAQ suggestions and staff FAQs
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\help\\faq-list.tsx"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\help\\faq-list.tsx"
timestamp: 2026-11-10T16-30-00Z
slug: src-app-help-faq-list-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 28/40 (Good)
1 Status 3 · 2 Real world 3 · 3 Control 3 · 4 Consistency 3 · 5 Error prevention 2 (typed text lost on errors) · 6 Recognition 3 · 7 Flexibility 3 · 8 Minimalist 3 (suggestions push Send down) · 9 Error recovery 2 (failed search hid the list) · 10 Help 3

## Specificity
Copy is product-specific (barangay certificate, Taglish keywords, "Save as FAQ" privacy note). Staff pages reuse the Questions/Listings tab, search and paging patterns.
Detector: CLI clean on 9 files. Overlay: overused-font (design-system choice); nested-cards on the suggestions panel (fixed). axe clean in both themes at 360 and 1280; no sideways scroll; inputs ≥16px; targets ≥44px.

## Priority issues (all fixed unless noted)
1. [P1] A failed or rate-limited search emptied the FAQ list. FIXED: full list stays, error as a Notice.
2. [P1] Staff FAQ form (and the ask form, pre-existing) lost typed text on a validation error. FIXED: actions echo `values`; fields refill.
3. [P2] Suggestions pushed Send down 170–250px. FIXED (user chose the slimmer panel): hairline + label, one-line snippets, no nested card.
4. [P2] Result list jumped ~450px between typing pauses. FIXED: last results stay until new ones arrive; reserved status line.
5. [P2] /help#faq-… scrolled but didn't open. FIXED.
6. [P2] Focus lost after Show all / Clear search; no-match not announced. FIXED.
7. [P2] Links inside suggestions lost the draft question. FIXED (user choice): open in a new tab.
8. [P2] Locked FAQ shown as a disabled form. FIXED: read-only view.
9. [P2] Admins approved raw link syntax unseen. FIXED: "How students see it" preview.
10. [P2] Clipped chevron in suggestions. FIXED: shared chevron.
11. [P3] Ask hand-off overwrote typed text; heading under sticky header. FIXED.
12. [P3] Searching caption, min-length hint, single result opens, zero-FAQ state, wording, 14px snippets, Archive not red, Save as FAQ in the action row, "FAQs · N drafts" by the Questions title. FIXED.

## Product questions (user's answers)
Topic-aware suggestions: YES (built). Drafts waiting on Overview: YES (built). Merge the two text boxes: not now.
