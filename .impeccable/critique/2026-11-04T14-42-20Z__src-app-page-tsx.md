---
target: home
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\page.tsx"
target_fingerprint: "sha256:90ba28def5c24ff614c6a2fd61b9b2b533d9a4ec9d6c36dc0223e32b990cfe4e"
target_path: "C:\\Users\\TUF DASH\\Desktop\\ST\\Iskolar\\src\\app\\page.tsx"
timestamp: 2026-11-04T14-42-20Z
slug: src-app-page-tsx
---
Method: dual-agent. Landing (src/app/page.tsx), Persuade. Heuristics 22/32 (7,10 n/a).
[P1] "Check my eligibility" (page.tsx:84) goes to /check → 307 /login for visitors; promise "2 minutes" lands on sign-in.
[P2] Centerpiece (explained verdict) absent; generic CTA strip (page.tsx:74-85).
[P2] Drift: tinted icon circle (page.tsx:75), provider tiles hover border-primary (:112), off-scale py-10/sm:py-14/gap-x-10/gap-5/p-5.
[P2] Touch targets: popular-search chips 36px (:51), "View all scholarships" 21px (:90); OWWA mark clips in sm tile (bits.tsx:13).
[P3] Provider list looks clickable but isn't (:125-130); "0 listings" tile links to empty results (:115).
Detector: clean (overused-font = Inter by design).
