---
target: admin users
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(admin)\\admin\\users\\page.tsx"
target_fingerprint: "sha256:999db456bf8b6dcd2b991a51a9cffca3b87cd798baea7db96f7c675dfa15c7e8"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(admin)\\admin\\users\\page.tsx"
timestamp: 2026-11-08T05-07-12Z
slug: src-app-admin-admin-users-page-tsx
---
Method: dual-agent. Group 4 shared: [P0] /admin/users role select commits onChange (users-table.tsx:37); [P1] consequential actions (deactivate, publish/unpublish incl. batch, archive, close) lack confirm/undo; [P1] editor (L helper) and announcement form errors not tied to fields, focus to body, editor fires 6 alerts; [P1] account-menu focus ring cancelled by outline-none (account-menu.tsx:31); [P2] sample listings show Verified; outline Delete renders ink not danger; filters fill first screen on phones; axe region on office band (header.tsx:16). Detector: #334155 provider default (new, advisory), 11px documented, Inter intentional.
Users 22/40. [P0] role select commits onChange; [P1] deactivate one click, single and bulk; [P2] grid rows misaligned, role shown twice; phone email truncated; 18px checkboxes without label; [P3] toast shows raw role key.
