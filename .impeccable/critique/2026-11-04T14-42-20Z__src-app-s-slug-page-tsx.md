---
target: detail
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\s\\[slug]\\page.tsx"
target_fingerprint: "sha256:f29735f7a6cf7d3d41bee3dee1778fcfbed2bef131a7d1c0096a1ae16937186f"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\s\\[slug]\\page.tsx"
timestamp: 2026-11-04T14-42-20Z
slug: src-app-s-slug-page-tsx
---
Method: dual-agent. Scholarship detail (src/app/s/[slug]/page.tsx + detail-body, criteria, checklist, detail-actions). Heuristics 28/40.
[P1] Deadline understated: "Time left" neutral at 4 days (urgency ladder says amber) (detail-body.tsx:46,103); dates below 3 buttons at 360.
[P1] Primary action "Mark as submitted" while documents are missing (detail-actions.tsx:76-82).
[P2] Reminder card promises a 7-day reminder when 4 days are left; "by email, on-site alert" grammar (page.tsx:51-52).
[P2] Visitor auth CTAs split between Sign in and Create account (detail-actions.tsx:50, criteria.tsx:46, checklist.tsx:82, page.tsx:62).
[P2] Notice line length ~101ch (notice.tsx:22, no max-width).
[P3] p-5 aside cards (page.tsx:46,68), gap-1.5, "Back to search results" for any entry path; small inline links under 44px.
Detector: nested-cards x3 (criteria/document lists inside the card: sanctioned by DESIGN.md), overused-font (by design).
