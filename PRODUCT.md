# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Filipino college students, across programs and year levels, looking for scholarships and educational assistance. They usually find out about scholarships on their phones through Facebook pages, school announcements and word of mouth. They are often stressed and up against a deadline, and they need to know quickly what exists, whether they qualify, what documents to get and where, and when everything is due.

Secondary:
- **Coordinators**: staff of scholarship providers or schools. They post and update official listings, keep deadlines and requirements current, answer student questions and post announcements.
- **Admins**: the Iskolar platform team. They verify listings against official sources, publish them, manage user accounts and review the audit log.

## Product Purpose

A centralized scholarship information and management system that is open to any Filipino college student, not tied to one school. It replaces scattered, late and sometimes conflicting announcements with one place where students can discover scholarships, check their eligibility with an explanation, follow step-by-step application guides and document checklists, track their applications, and get reminders before deadlines.

Success means students find relevant scholarships early enough to prepare, don't spend effort on scholarships they can't qualify for, and don't miss deadlines.

## Positioning

The **explainable eligibility check** is the centerpiece (research recommendation). Iskolar doesn't just say "eligible" or "not eligible". It shows, for each requirement, whether it is met, not met or unknown and why, and it separates confirmed eligibility from possible eligibility when answers are missing. Every listing shows its official source, when it was last checked, and whether it is verified. That makes it a preparation tool rather than an announcement board.

## Operating Context

- Mostly on mobile browsers. Social media and mobile browsing are how students discover scholarships.
- Student journey (from research): register → explore → check eligibility → review details → prepare requirements (checklist, where to get each document) → receive reminders → track progress (saved, preparing, submitted, then approved or rejected).
- Real-world documents students handle: COR, Certificate of Grades, ITR or Certificate of Indigency, PSA birth certificate, 4Ps/Listahanan certification, OWWA membership proof. These come from the registrar, barangay hall, PSA, DSWD, OWWA and similar offices.
- Coordinators and admins work on desktop as well as mobile, in tables, forms and review queues.

## Capabilities and Constraints

- Three roles: student, coordinator, admin. Admin accounts are never self-registered.
- Modules (research priority): centralized database, eligibility checker, search and filtering, deadline notifications, application guides and checklists (all high); application tracker, admin management, inquiry/FAQ (medium).
- Statuses that must stay distinct: open, upcoming, closed, and unverified.
- Notifications by email, web push and on-site alerts. SMS is out of scope for now: there's no provider and it isn't in the build brief.
- The eligibility result is a **preliminary check, not an official decision**. The provider always makes the final call, and that disclaimer must stay.
- Terminology: GWA (1.00 is the highest grade at most schools), 4Ps / DSWD Listahanan, OFW / OWWA, COR, barangay, LGU, CHED, UniFAST, DOST-SEI, TES, TDP.

## Brand Commitments

- Name: **Iskolar**.
- Logo mark: the rounded blue square with a white graduation cap and a gold tassel (from `reference/iskolar-prototype.html`, `LOGO`).
- Voice: plain, student-friendly English. Second person, short sentences, no jargon or with jargon explained ("You qualify", "Might qualify", "Not eligible right now", "Where to get it").

## Evidence on Hand

- `reference/context.md`: survey synthesis, 29 responses and 27 consenting respondents. Present these as insights from respondents, not as conclusions about all students.
- `reference/iskolar-prototype.html`: features, copy, flows, and **sample** data.
- The 9 seeded scholarships and all "(sample)" providers are **test data only**. They are marked as sample in the product and never presented as official. Real listings will be entered and verified by coordinators and admins later.
- There are no testimonials, user counts, partner logos or impact numbers. Don't invent any.

## Product Principles

1. **Explain, don't just judge.** Every eligibility verdict shows which requirement is met, unmet or unknown, and why.
2. **Trust is visible.** Source, last-checked date and verification status are on every listing. Unverified listings carry a warning before a student spends on documents.
3. **Time is the enemy.** Surface what is closing soon and which documents are still missing before anything else.
4. **Plain words over official prose.** Turn long announcements into eligibility, benefits, documents, steps and deadlines without losing the official source.
5. **The student stays in control.** They choose their notification channels and timing, manage their own answers and track their own applications.

## Accessibility & Inclusion

WCAG 2.2 AA (from the build brief), mobile-first down to 360px, and keyboard navigation for every menu, dialog and tab. Reduced-motion support, plus language and flows that work for students with different levels of technical skill.
