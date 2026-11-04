---
target: help
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\help\\page.tsx"
target_fingerprint: "sha256:166c70413e9cf8890003002580a8ddc4b1389a759cac202630958f28cadbb25b"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\help\\page.tsx"
timestamp: 2026-11-04T14-42-20Z
slug: src-app-help-page-tsx
---
Method: dual-agent. Help and FAQ (src/app/help/page.tsx, ask-form.tsx), Read. Heuristics 28/40.
[P1] "Ask the scholarship office" (detail-body.tsx:209) lands at the top; form ~750px down at 360. Add #ask-h and put the form first when ?about is set.
[P2] "The scholarship office" ambiguous for general questions (page.tsx:30,53; ask-form.tsx:47).
[P2] FAQ answers are dead text: no links to reminder settings, eligibility check; no ids for deep links.
[P2] h2s 18px on desktop (no sm:text-title); p-5/px-5 off-scale; FAQ h2 repeats h1.
[P3] Replies use ok-wash (status colour as decoration) (page.tsx:70); "Sign in to ask" for visitors.
Detector: clean (overused-font by design).
