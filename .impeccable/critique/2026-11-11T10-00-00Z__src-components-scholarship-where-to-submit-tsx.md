---
target: Revisions group G (where to submit; visitor nav and sign-in pages)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\components\\scholarship\\where-to-submit.tsx"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\components\\scholarship\\where-to-submit.tsx"
timestamp: 2026-11-11T10-00-00Z
slug: src-components-scholarship-where-to-submit-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 28/40 (Good)
1 Status 3 · 2 Real world 3 · 3 Control 3 · 4 Consistency 2 (editor order differed from students'; "Online" meant two things) · 5 Error prevention 3 · 6 Recognition 3 · 7 Flexibility 3 · 8 Minimalist 2 (sample data repeated itself and the steps) · 9 Error recovery 3 · 10 Help 3

## Specificity
Placement after "Documents to prepare" follows the student's real sequence. Detector: CLI clean; URL scans flagged only pre-existing items (font choice, nested lists in sections, notice line length). axe clean in ~60 runs; every gated route returns to the exact URL after sign-in.

## Priority issues (all fixed)
1. [P1] Sample data repeated itself and the How to apply steps; "online" links were agency homepages. FIXED: rewritten values; pgTAP guards the Website/Source duplicate.
2. [P2] Rows had equal weight. FIXED (user chose): lead line "In person at …" / "Online at …", details below.
3. [P2] Visitor announcements prompt broke on phones and had no sign-in path; sign-up lost `next`. FIXED: inline icon, "Create an account or sign in", `next` carried through sign-up → confirm → onboarding → /continue (user chose onboarding first).
4. [P2] "Online" on in-person listings. FIXED: "Website".
5. [P2] Editor order, method far from the link it requires, ragged grid, stale error, http/https mismatch. FIXED.
6. [P2] 24px links on phones. FIXED: 44px below 900px.
7. [P3] Two "Sign in" links at 640–899px; untruncated link ellipsis; no summary in My applications; dead-end empty state; generic sign-in notice. FIXED.

## Extras (user's choice)
Maps link on real addresses: added. "Create an account to check eligibility" on wide screens: added.
