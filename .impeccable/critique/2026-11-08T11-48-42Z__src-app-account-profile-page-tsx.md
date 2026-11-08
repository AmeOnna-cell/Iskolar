---
target: Group C revisions (bell, profile, self-delete)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(account)\\profile\\page.tsx"
target_fingerprint: "sha256:d39163a592893b22d2ab0ea7c58daab670a678ac9007a4516ba9db5587eb58b4"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\(account)\\profile\\page.tsx"
timestamp: 2026-11-08T11-48-42Z
slug: src-app-account-profile-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser), one run for Group C (bell dropdown, account menu, My profile, self-delete, goodbye).

## Design Health Score — 27/40, Acceptable (top of band)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Disabled delete button gave no reason |
| 2 | Match system / real world | 3 | "Alerts" vs "notifications" wording |
| 3 | User control and freedom | 3 | Delete dialog kept stale errors and typing on reopen |
| 4 | Consistency and standards | 2 | Dialog didn't return focus (Drawer did); mixed save-button styles |
| 5 | Error prevention | 3 | Strong delete guard; four forms on one page |
| 6 | Recognition rather than recall | 2 | Reminders buried in a long My profile page, no Settings item |
| 7 | Flexibility and efficiency | 3 | Arrow-key menus, #reminders deep link |
| 8 | Aesthetic and minimalist design | 3 | Staff-only aside floating outside cards; goodbye pushed sign-up |
| 9 | Error recovery | 3 | Inline password errors with focus |
| 10 | Help and documentation | 2 | No privacy link before the irreversible step |

## Design specificity
Disciplined system use; layouts are the standard dropdown / settings cards / danger zone. Product voice lives in the copy. Missed: urgency colours in the bell.

Detector: CLI 0 findings. Overlay: overused-font (Inter, the DESIGN font: false positive), flat-type-hierarchy on the phone dashboard (h1 18 = h2 18, the leader's smaller greeting; weight separates them), 2× low-contrast on the disabled push row (opacity-60). Behaviour: bell order/limit/unread styling/arrow keys/Esc/mark-all/live count/item click/360 layout, menus for student and admin, redirects, 16px inputs, no overflow, password change, delete guards and outcome all PASS. FAIL: dialog focus return.

## Priority issues (and what was done)
1. [P1] Dialogs didn't return focus (no D.Trigger) — affected every Dialog in the app → fixed in `components/ui/dialog.tsx`: remembers the opener on open and focuses it on close; E2E asserts it.
2. [P2] Menu keyboard highlight looked like "unread", no focus ring → fixed: ring on highlighted items in both menus; unread keeps its wash.
3. [P2] Reminders hard to find → "Reminder settings" link in the bell footer; jump links under the My profile heading.
4. [P2] Delete dialog kept stale state; silent disabled button → the form remounts on every open; the button stays enabled and the database's email check explains a mismatch.
5. [P3] Goodbye pushed sign-up; dense dialog copy → one quiet "Find scholarships" action; dialog lists Deleted / Kept, links the privacy page and offers "Change your reminders instead".

Also: the bell refreshes in place on Realtime changes; staff-only reminders aside removed; disabled push row no longer fades its hint to 2.4:1.

## Left
- Urgency colours for deadline alerts in the bell (needs the scholarship's dates in the query).
- Header "Create account" still shows on /goodbye (global header).
- 13px caption hints (DESIGN.md Caption).
