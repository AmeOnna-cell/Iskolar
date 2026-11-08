---
target: Group D revisions (/announcements)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\announcements\\page.tsx"
target_fingerprint: "sha256:5e3fcc588a296f4f438a7265bd19471e4775e47f3186cde79a8b46d3edcff85f"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\announcements\\page.tsx"
timestamp: 2026-11-08T14-51-52Z
slug: src-app-announcements-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser), one run for Group D (public Announcements board).

## Design Health Score — 26/40, Acceptable

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Deep links (?a=) opened nothing below lg; no announcement when the wide panel changed |
| 2 | Match system / real world | 3 | "latest Today"; vague "Scholarship office" sender |
| 3 | User control and freedom | 3 | No "Clear search" in the no-match state |
| 4 | Consistency and standards | 2 | Neutral deadline (detail page shows urgency); banned left-bar selection |
| 5 | Error prevention | 3 | Unknown ?a= silently showed General |
| 6 | Recognition rather than recall | 3 | No "new since last visit" |
| 7 | Flexibility and efficiency | 2 | No link to a single post |
| 8 | Aesthetic and minimalist design | 3 | Long phone intro |
| 9 | Error recovery | 2 | Empty search had no way forward |
| 10 | Help and documentation | 3 | Intro + header "?" |

## Design specificity
On-system (ruled list, label-above-value dates, shared drawer); the board pattern itself is generic. Iskolar-specific: the scholarship's dates and "View the scholarship".

Detector: CLI 0 findings. Overlay: overused-font only (Inter, DESIGN font: false positive); nested-cards on / (pre-existing landing eligibility example). Behaviour: list order, search + live count, in-place selection, drawer at 360/768 with Esc/Back/focus/scroll, nav, five tabs, header Help, signed-out header fits at 360, details link all PASS. FAIL: 1000–1023px opened the drawer and hid the panel (matchMedia 1024 vs Tailwind lg = 1000) — also on /explore since group B.

## Priority issues (and what was done)
1. [P1] Links from the dashboard and details opened nothing on phones → arriving with ?a= on a narrow screen opens that entry's drawer (pushed, so Back returns to the list); the selected row is marked at every width.
2. [P1, from B] 1000–1023px panel/drawer mismatch → one `WIDE_QUERY` (lg, 1000px) in `drawer.tsx` used by both boards; DESIGN.md/PROGRESS corrected; E2E at 1010px.
3. [P2] Deadline without urgency → "Time left" with the urgency ladder colour (or Opens in / Closed) in the header.
4. [P2] Banned left-bar selection → Blue Wash row with Civic Blue name.
5. [P2] Unclear sender → the default "Scholarship office" shows the scholarship's provider instead.
6. [P3] No way out of an empty search; long phone intro → "Clear search" and "Find scholarships"; second intro sentence hidden on phones.

Also: unknown or non-public ?a= shows a notice; a polite live region names what the panel shows; "latest today"; scrolling panel and drawer body are focusable (axe scrollable-region-focusable).

## Left
- Link to a single post (#an-id) and "new since your last visit".
- Grouping closed scholarships once the list grows.
- Announcement alerts still open the dashboard (needs a migration to point them here).
