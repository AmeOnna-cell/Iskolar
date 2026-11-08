---
target: Group B revisions (/explore)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\explore\\filters.tsx"
target_fingerprint: "sha256:0b4c1c9830bfc356b7729ccd90a611032a952a69919918501dd9529669be45c6"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\explore\\filters.tsx"
timestamp: 2026-11-08T11-02-03Z
slug: src-app-explore-filters-tsx
---
Method: dual-agent (A: design review · B: detector + browser), one run for Group B (/explore filter drawer, new card, details drawer).

## Design Health Score — 27/40, Acceptable (top of band)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Applied filters shown only as a count |
| 2 | Match system / real world | 3 | "3d ago" shorthand; provider types unexplained |
| 3 | User control and freedom | 3 | Scrim dismiss silently discards the draft; empty state also wiped the search |
| 4 | Consistency and standards | 3 | New tag style; drawer link not underlined; amount weight 700; 1024 vs DESIGN's 1000 |
| 5 | Error prevention | 2 | Done gives no result preview (0 results possible) |
| 6 | Recognition rather than recall | 2 | Icon-only filter button on phones; applied filters invisible |
| 7 | Flexibility and efficiency | 3 | URL state, modified clicks, real radios |
| 8 | Aesthetic and minimalist design | 3 | Calm card; uniform bold amounts |
| 9 | Error recovery | 2 | Empty state didn't name the filters |
| 10 | Help and documentation | 3 | Good contextual copy |

## Design specificity
Mostly specific (provider tiles, ₱ split from period, PH regions, verdict and Sample pills, urgency ladder). "Posted …" is job-board furniture; kept because the leader specified it.

Detector: 1 advisory (11px provider monogram, allowed by DESIGN.md prose: false positive). Overlay: overused-font (Inter is the DESIGN font: false positive), 3× nested-cards (bordered lists in the side panel, pre-existing), 1 straggler in seed copy. Behaviour: filter drawer URL state, Esc/Back/focus return, Done/Clear all, combobox Esc, focus trap, bottom sheet geometry, 16px inputs, details drawer Back + scroll restore all PASS. FAIL: 7px sideways scroll at 360 (grid without a column template sized to the card's min-content: truncated location + tag).

## Priority issues (and what was done)
1. [P1] Sideways scroll at 360 on /explore and / → fixed: `grid-cols-[minmax(0,1fr)]` below lg, location wraps instead of truncating, Sort select capped. 4.13 now catches it; new explicit check too.
2. [P1] Applied filters invisible; empty state couldn't diagnose → fixed: "Filters on" row of removable chips plus "Clear filters" under the search; empty state names the filters and offers "Clear filters" (keeps the search) and "Clear search" separately.
3. [P2] Done is blind; scrim dismiss loses the draft → not changed: the leader specified Done; a live result count would need a count endpoint. Raised with the user.
4. [P2] First card looked selected on phones → fixed: the selected ring only from 1024px, where the side panel exists.
5. [P2] Details drawer stacked two headers; title read twice → fixed: dialog named by the scholarship (visually hidden, not a heading), floating close button, no duplicate description; focus starts on the dialog.

Also: location line wraps (keeps "(city residents)" readable), bordered provider tag (visible in dark), underlined "Open the full page", DESIGN.md updated (1024px split view, drawers, amount 700 exception).

## Persona red flags (before fixes)
- First-timer on a phone: icon-only filter button, no "discarded" signal on scrim tap, provider types unexplained.
- Screen-reader user: dialog "Scholarship details" announced twice; focus landed on Close.
- Deadline-driven student: deadline below the louder amount; location cut at "(city re…".

## Minor (left)
- Icon-only filter button below 640px (leader asked for an icon button; it has an accessible name and count).
- "Posted" on sample listings shows seed dates.
- d=1 left open when a window widens past 1024.
