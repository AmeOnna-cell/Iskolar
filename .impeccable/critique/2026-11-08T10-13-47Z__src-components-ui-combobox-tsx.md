---
target: Group A revisions
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\components\\ui\\combobox.tsx"
target_fingerprint: "sha256:b9155af67e2d1d8556fcd92c8deb8dcf26fdad33e290509333759b2462b36989"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\components\\ui\\combobox.tsx"
timestamp: 2026-11-08T10-13-47Z
slug: src-components-ui-combobox-tsx
---
Method: dual-agent (A: design review · B: detector + browser), single run for the whole of Group A.

## Design Health Score (scope: Group A revisions) — 27/40, Acceptable

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | "Link copied" toast and SR match count work; "Results" tab invisible at 360 |
| 2 | Match system / real world | 2 | Course/region search failed on students' words ("Nursing", "Cebu") |
| 3 | User control and freedom | 3 | Partial text silently discarded on blur |
| 4 | Consistency and standards | 3 | Audit filter mixes combobox (Action) and native select (About) |
| 5 | Error prevention | 2 | Unknown entry silently reverts before submit |
| 6 | Recognition rather than recall | 3 | Must recall Iskolar's category words |
| 7 | Flexibility and efficiency | 3 | Text not selected on focus |
| 8 | Aesthetic and minimalist design | 3 | Sticky header + pinned footer take 41–49% of the panel |
| 9 | Error recovery | 2 | "No matches" dead end |
| 10 | Help and documentation | 3 | Disclaimer and "confirm details" kept |

## Design specificity
Mostly specific: sticky panel keeps the Sample pill and the one blue action; Share fits how students find scholarships (Facebook/Messenger). The combobox was the generic part until it learned students' words.

Detector: 1 advisory finding (`#334155` default provider colour, listing-form.tsx:167, data not UI: false positive). Overlay on 5 pages: overused-font (Inter is the DESIGN.md font: false positive) and nested-cards on bordered criteria/document lists inside the detail panel (pre-existing, borderline). Sticky header, combobox keyboard path and 360/768 overflow all passed. Explore filter selects are 14px on phones (Group B moves them into a drawer at 16px).

## Priority issues (and what was done)
1. [P1] Course/region search failed on the words students use → fixed: keyword lists per course area and region (courses, cities, provinces), single-match pick on blur, "No matches for “X”. Choose from the list:" with the full list kept below.
2. [P1] Combobox on phones: keyboard covers the list, tab bar paints over it → fixed: list z-40 above the tab bar, field scrolls to the top on touch before opening, list opens upward when there's no room below (also inside dialogs). Native selects for course/region on phones NOT adopted: the leader's list names course and region explicitly. Open question for the user.
3. [P1] "Results" tab invisible on phones → fixed: right-edge fade plus end padding, so the cut-off tab reads as more.
4. [P1] Shared sample listings lost their label → fixed: share title "(sample listing)"; Open Graph title/description lead with "Sample listing · Deadline …".
5. [P2] Sticky header tall and pins type/location instead of the deadline; dead "See what's missing" anchor in the panel; focus could hide under the header → anchor fixed (sid), scroll-padding-top on the panel. Pinned content kept as the leader specified. Open question for the user.

Also: listbox now named by the field's label; text selected on focus; tapping an open box no longer closes it; dashboard phone greeting 18px with its fact at 14px medium (DESIGN.md exception recorded), mt on the 4px scale.

## Persona red flags (before fixes)
- First-year student on a cheap Android phone: list hidden by keyboard/tab bar; "Nursing" → no match → silent reset; never finds "Results"; shares a sample listing that looks official.
- Keyboard/screen-reader user: listbox named by placeholder; Shift+Tab could hide focus under the sticky header.
- Coordinator: type-ahead is a win; had to delete the old label by hand.

## Minor (left)
- 13px caption token used for card meta lines (design-system token, not body copy).
- `[scrollbar-width:none]` needs Safari 18.2+.
- Signed-out panel header has 7–8 items at one decision point.
