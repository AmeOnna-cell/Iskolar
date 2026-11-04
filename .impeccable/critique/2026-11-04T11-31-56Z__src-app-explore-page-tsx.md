---
target: find scholarships
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\explore\\page.tsx"
target_fingerprint: "sha256:2d01a5df87c4b5845099dbccec4c494f9b0a7efb65a98fcc343a8b3eaf5dfc51"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\explore\\page.tsx"
timestamp: 2026-11-04T11-31-56Z
slug: src-app-explore-page-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)
Target: Find scholarships (src/app/explore/page.tsx). Heuristics 27/40 (1:2 2:3 3:3 4:2 5:3 6:3 7:3 8:2 9:3 10:3).
Specificity: detail panel (criteria list, dates strip, notices) is product-specific; filter bar + 4-pill cards are category-generic.
Detector: clean except documented 11px provider-mark exception. Overlay: skipped heading (h1 → card h3, no h2 for the results list; page.tsx:42, card.tsx:61); nested-card advisory (criteria lists inside the bordered panel, low).
Browser: no overflow; card gap 12px; card padding 20px desktop (off-scale); "Create account" 36px tall; footer links 21px.
Priority issues:
[P1] At 360px ~480px of controls before the first result (full-width Search button, 5 wrapping selects, sort row) (filters.tsx:71,112,121).
[P1] "Not eligible"/"Might qualify" pills without the reason line in the default list (explore/page.tsx:65 reason={params.mine}); wording should be "Not eligible right now" (bits.tsx:48).
[P2] Dense cards with decision facts split: verdict in the pill row, deadline below; provider-type pill and "Posted" redundant (card.tsx:70-86).
[P2] Panel opens with the sample notice above the name, repeats the sample pill, and clips with no scroll cue (detail-body.tsx:53-59,92; explore/page.tsx:95).
[P2] Skipped heading level in the results list.
[P3] Filter bar: Clear on its own line (also for keyword only), off-scale mt-5/px-5, link-chip styled like a filter, no visible pending state while filtering, router.replace means Back leaves the page.
