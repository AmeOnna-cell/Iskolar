---
target: My applications two-pane (group E)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(student)\\applications\\page.tsx"
target_fingerprint: "sha256:d72efa0d4d6a043155f13fc38310c0ca91ade26fc0604b51c91fa3cd546506cc"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(student)\\applications\\page.tsx"
timestamp: 2026-11-08T15-38-16Z
slug: src-app-student-applications-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 28/40 (Good, low end)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Drawer dropped the days-left count |
| 2 | Match System / Real World | 3 | "Eligibility 2/5" bar read as progress, not a verdict |
| 3 | User Control and Freedom | 3 | Search lost on tab switch |
| 4 | Consistency and Standards | 2 | Panel trust signals differ from DetailBody |
| 5 | Error Prevention | 2 | Mark as submitted with unticked docs, no nudge; unverified listings unwarned |
| 6 | Recognition Rather Than Recall | 3 | Search scoped to the current tab |
| 7 | Flexibility and Efficiency | 3 | No cross-stage view |
| 8 | Aesthetic and Minimalist Design | 3 | ~390px of header above the first phone row |
| 9 | Error Recovery | 3 | Clear search on misses |
| 10 | Help and Documentation | 3 | Where-to-get-it and disclaimer present |

## Specificity
Product-specific checklist, urgency ladder, provider marks, sample pill. Generic part: stage dot + two bars.
Detector: CLI clean (applications/, split.tsx). Overlay: overused-font (design-system choice, false positive), nested-cards x3 (bordered lists inside the bordered panel, same as Explore).

## Priority issues
1. [P1] Eligibility bar hid the verdict (tracking-list.tsx). FIXED: verdict words and colour on the bar.
2. [P1] Panel dropped trust signals (detail.tsx). FIXED: Unverified pill + "Not yet verified" notice.
3. [P1] Phone drawer buried the task and lost urgency. PARTLY FIXED: due text under the name. Kept the brief's order (control before checklist) and "Last updated".
4. [P2] Search only covered the current tab. FIXED: search spans all stages, tabs step aside.
5. [P2] Submitting with docs missing had no nudge. FIXED: "N documents not ticked yet."

## Minor
Preparing dot was amber beside amber urgency (FIXED: blue). "Tracking list" h2 repeated h1 on phones (FIXED: sr-only below lg). "Not approved" had no next step (FIXED: link to open scholarships). Open: drawer title link 24px tall at 360; "Deadline" + "Closes in" wrap at 360; double scroll at 1280 (matches Explore).

## Questions
Rows naming the next missing document instead of two bars? Stages as one list with a stage filter? Mark as submitted at the end of the checklist?
