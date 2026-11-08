---
target: listing editor
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(staff)\\staff\\listings\\[id]\\page.tsx"
target_fingerprint: "sha256:999ce3e67ecd801825712a86319dc68980946abe9c5cd81b8b888e22dd9d0f56"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(staff)\\staff\\listings\\[id]\\page.tsx"
timestamp: 2026-11-08T05-07-11Z
slug: src-app-staff-staff-listings-id-page-tsx
---
Method: dual-agent. Group 4 shared: [P0] /admin/users role select commits onChange (users-table.tsx:37); [P1] consequential actions (deactivate, publish/unpublish incl. batch, archive, close) lack confirm/undo; [P1] editor (L helper) and announcement form errors not tied to fields, focus to body, editor fires 6 alerts; [P1] account-menu focus ring cancelled by outline-none (account-menu.tsx:31); [P2] sample listings show Verified; outline Delete renders ink not danger; filters fill first screen on phones; axe region on office band (header.tsx:16). Detector: #334155 provider default (new, advisory), 11px documented, Inter intentional.
Editor 21/40. [P1] no unsaved-changes guard; [P1] status panel acts on saved version while form dirty, Publish/Unpublish unconfirmed; [P1] validation a11y (L helper, 6 alerts, focus body); [P2] EMPTY_LISTING seeds blank required document; optional fields unmarked; fixed bars 196/740px at 360; coordinator dead-end on unassigned listing; [P3] legend announced twice, slug jargon.
