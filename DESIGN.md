---
name: Iskolar
description: Scholarship finder and application tracker for Filipino college students: calm, official and plain-spoken.
colors:
  primary: "#1F4FD1"
  primary-hover: "#173FAD"
  primary-wash: "#EDF2FF"
  on-primary: "#FFFFFF"
  band: "#0F2C6E"
  band-raised: "#163A8A"
  band-text-soft: "#C9D3EE"
  tassel-gold: "#FFC83D"
  canvas: "#F3F4F6"
  surface: "#FFFFFF"
  surface-subtle: "#F8F9FB"
  surface-hover: "#F1F4FA"
  hairline: "#E1E4EA"
  hairline-strong: "#C9CED8"
  ink: "#1D2433"
  ink-secondary: "#545E70"
  ink-hint: "#646D7E"
  ok: "#11703F"
  ok-wash: "#E6F5EC"
  warn: "#8F5300"
  warn-wash: "#FFF3D9"
  danger: "#B42318"
  danger-wash: "#FDECEA"
  toast-ink: "#1D2433"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title-lg:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  stat:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.surface-hover}"
  button-sm:
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
  pill:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "26px"
  pill-ok:
    backgroundColor: "{colors.ok-wash}"
    textColor: "{colors.ok}"
  pill-warn:
    backgroundColor: "{colors.warn-wash}"
    textColor: "{colors.warn}"
  pill-danger:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
  pill-info:
    backgroundColor: "{colors.primary-wash}"
    textColor: "{colors.primary}"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-hint}"
    typography: "{typography.caption}"
    height: "64px"
---

# Design System: Iskolar

## Overview

**Creative North Star: "The Clear Counter"**

Iskolar is the government service window that finally explains things. It carries the authority of an official counter, with deep civic blue, ruled forms, sources and dates on everything, but it talks to the student across the counter in plain words and tells them exactly what to bring, where to get it, and how many days they have left. Trust comes from precision and honesty, not from decoration.

The system is **calm, ruled and quietly dense**. Surfaces are flat and separated by hairlines and tonal steps, the way a well-kept register is ruled. Color is spent on meaning: blue for the one thing to do next, and green, amber and red only for status (met, unknown, not met; open, closing soon, closing now). The interface stays still. Motion exists only to confirm that something happened. Students arrive stressed, on phones, often near a deadline, so every screen answers "what do I do now?" before anything else.

This system rejects the "AI dashboard" look: no gradient hero mesh, no glassmorphism, no colored left-border cards, no decorative icons in tinted circles on every row, no big-number-plus-tiny-label stat tiles used as filler, no motion for its own sake.

**Key Characteristics:**
- One deep civic blue (`primary`) for the single next action and active navigation. Everything else is neutral ink on white.
- Status colors (`ok`, `warn`, `danger`) are a vocabulary, never decoration.
- Flat surfaces on a cool grey canvas. Hairline borders do the separating, and shadows appear only on overlays.
- Inter throughout. Hierarchy comes from weight (400 → 600 → 700) and a short, strict size scale.
- A strict 4px-based spacing scale with generous gaps *between* groups and tight gaps *within* them.
- A navy `band` hero on public pages only, then straight to the quiet canvas.
- Light and dark themes with equal care. The theme toggle is always available.

## Colors

The palette is cool and institutional: one civic blue, a ladder of cool neutrals, and three status hues that each come as a strong ink and a pale wash.

### Primary
- **Civic Blue** (primary): the filled primary button, active nav and tab underline, focus rings, links, selected chips and wizard choices, the progress meter fill. Only one filled Civic Blue button per view region.
- **Pressed Civic Blue** (primary-hover): hover and active state of the primary button.
- **Blue Wash** (primary-wash): background for selected filter chips, info notices, the step-number discs in "How to apply", unread alert rows and the avatar disc.
- **Night Registry Navy** (band): the landing and auth hero band, the staff-view bar, and the email template header. Never used as a card fill inside the app.
- **Raised Navy** (band-raised): hover and raised elements sitting on the band.
- **Band Mist** (band-text-soft): secondary text on the navy band (subtitles, stat labels, "Popular searches").
- **Tassel Gold** (tassel-gold): appears only in the logo's tassel stroke. Never in UI chrome.

### Neutral
- **Counter Grey** (canvas): the page background behind every card.
- **Paper** (surface): cards, header, tab bar, dialogs, inputs.
- **Ledger Tint** (surface-subtle): table headers, neutral pills, the date-chip month strip, meter tracks.
- **Hover Tint** (surface-hover): hover rows, menu items, outline-button hover.
- **Hairline** (hairline): card borders, row dividers, section rules.
- **Strong Hairline** (hairline-strong): input and outline-button borders, the hover border on cards.
- **Ink** (ink): headings, body copy, scholarship names.
- **Secondary Ink** (ink-secondary): descriptions, providers, sub-lines, criteria explanations.
- **Hint Ink** (ink-hint): timestamps, metadata, the inactive tab bar, helper text. Darkened from the prototype's #737C8C so it passes AA (5.2:1 on Paper, 4.7:1 on Counter Grey).

### Status
- **Approved Green** (ok) on **Green Wash** (ok-wash): "You qualify", "Met", "Open", "Verified", submitted/approved, all documents ready.
- **Caution Amber** (warn) on **Amber Wash** (warn-wash): "Might qualify", "Unknown", "Unverified", "Closes in ≤7 days", deadline-moved alerts.
- **Deadline Red** (danger) on **Red Wash** (danger-wash): "Not eligible", "Not met", "Closes in ≤3 days", destructive actions, form errors, the unread badge.

### Dark theme
Dark mode is a first-class theme, applied with `prefers-color-scheme` unless the user chooses explicitly (`data-theme`). Equivalent roles:

| Role | Dark value |
|---|---|
| canvas | #0E1117 |
| surface | #171B24 |
| surface-subtle | #1C212C |
| surface-hover | #202634 |
| hairline / hairline-strong | #2A3140 / #3A4254 |
| ink / ink-secondary / ink-hint | #E6E9EF / #AAB2C0 / #8790A0 |
| primary / primary-hover / primary-wash / on-primary | #7EA2FF / #A3BCFF / #1E2A4A / #0E1117 |
| band / band-raised | #111C3D / #18275A |
| ok / ok-wash | #5ACB8B / #14301F |
| warn / warn-wash | #F0BC5C / #352812 |
| danger / danger-wash | #FF8A7E / #3D1C19 |

### Named Rules
**The One Blue Action Rule.** Each view region (page header, card, dialog, sticky bar) has at most one filled Civic Blue button. Every other action is outline or text.

**The Status Means Status Rule.** Green, amber and red appear only to state eligibility, deadline urgency, verification or result. They are never decoration, never section accents, and never brand color.

**The Urgency Ladder Rule.** Open deadlines are Deadline Red at ≤3 days, Caution Amber at ≤7 days, and neutral ink otherwise. Upcoming and closed are always neutral.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui, -apple-system, Segoe UI)
**Body Font:** Inter
**Label Font:** Inter

**Character:** one honest, highly legible grotesque at three working weights. It reads like a well-set government form that someone actually proofread. Numbers use tabular figures wherever they line up (amounts, counts, dates).

### Hierarchy
- **Display** (700, clamp(28px → 40px), 1.15, −0.02em): the landing band headline only. Max ~22ch.
- **Headline** (700, 28px desktop / 24px below 640px, 1.2): page titles (`h1`): "Your eligibility results", "My applications", the scholarship name on its detail page.
  - Exception (team-leader revision): the dashboard greeting is 18px below 640px, with its one fact at 14px medium, to give phones a shorter band.
  - Exception (team-leader revision): the scholarship card's amount is 20px at 700 ("large and bold"), with its period beside it at 14px 500.
- **Title Large** (650, 20px / 18px mobile, 1.3): section headings inside a page (`h2`): "Closing soon", "Do you qualify?", "Documents to prepare".
- **Title** (600, 16px, 1.35): card titles (scholarship names in cards), list item leads, criterion labels.
- **Body** (400, 16px, 1.55): all running copy, inputs, descriptions. Max line length 70ch. Never below 16px in inputs (prevents mobile zoom).
- **Body Small** (400, 14px, 1.5): secondary lines, providers, criterion explanations, table cells.
- **Label** (600, 14px, 1.3): buttons, field labels, tab labels, nav links.
- **Caption** (500, 13px, 1.45): pills, timestamps, metadata, helper text, the mobile tab bar labels (12px allowed there only).
- **Stat** (700, 28px, tabular): the few numbers that are the point of their block (staff overview counts). Never a hero metric on the student dashboard.

**Tailwind token names (code):** `text-headline` 28 · `text-headline-sm` 24 · `text-title` 20 · `text-title-sm` 18 · `text-base` 16 · `text-sm` 14 · `text-caption` 13 · `text-tab` 12. The names are one step off the spec's: a section `h2` (Title Large) is `text-title-sm sm:text-title`, and a card title (Title, 16px) is `text-base font-semibold`.

### Named Rules
**The Five Sizes Rule.** Inside the app, text uses only 13, 14, 16, 20 and 28px (plus 24/18 as the mobile steps of the last two). The prototype's 11.5/12.5/13.5/14.5/15/17/19/22/26px half-steps are retired.

**The Weight Ladder Rule.** 400 for reading, 500 for captions and pills, 600 for naming and labeling, 650 for section headings, 700 for page headings only. Never bold a whole paragraph. Never set headings in color.

## Layout

The spatial model is a **centered reading column inside a centered page container**. Browsing surfaces (landing, explore, staff tables) use the wide container. Doing surfaces (dashboard, wizard, detail body, settings) use a narrower column so the eye travels one path.

- **Page container:** max 1200px, side gutter 24px (16px below 640px).
- **Reading column:** 760px for the student dashboard (single column, priority-ordered), 720px for the eligibility wizard and forms, 70ch for prose.
- **Explore:** list (≤440px) + sticky detail panel at ≥1000px (`lg`). Below that, a single list; a card opens its details in a drawer over the list (bottom sheet under 640px), and the full page stays for shared links. Filters live in a drawer behind a filter button, with the applied ones listed under the search box.
- **Detail page:** body column + 320px sticky aside at ≥1000px. The aside drops below the body under that width.
- **Staff tables:** full container width. Below 768px they become stacked row-cards, and bulk actions move into a sticky bottom action bar.

### Spacing scale
4px base: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64** (tokens `1`–`8`). No other values.
- Inside a component (icon to text, label to input, pill to pill): 4–8.
- Between items in a list or group (cards in a list, fields in a form group): 12–16.
- Between groups inside a card or section (heading block to content, form group to form group): 24.
- Card padding: 24 (16 below 640px). Card header row: 16 vertical / 24 horizontal.
- Between sections on a page: 32 (48 on landing).
- Page top padding 32, bottom 64 (plus the tab-bar height on mobile).

### Responsive Behavior
Mobile-first, from 360px up. Breakpoints: **640** (gutters, type steps), **768** (tables → cards), **900** (header nav ↔ bottom tab bar), **1000** (split view, sticky asides), **1280** (full container).
- Below 900px the header keeps logo, theme toggle, alerts and account. Primary navigation moves to the five-tab bottom bar (Dashboard/Home, Search, Eligibility, Applications, Help) with safe-area padding.
- Dialogs become full-height bottom sheets below 640px.
- Touch targets are ≥44px everywhere on mobile, including row checkboxes (via a padded label) and the save/bookmark button.
- No horizontal page scroll at 360px. Tables either reflow to cards or scroll inside their own container with a sticky first column.

### Named Rules
**The Proximity Rule.** The gap between groups is at least twice the gap within a group. If two things don't belong together, the whitespace has to say so.

**The One Column Dashboard Rule.** The student dashboard is a single centered column in priority order: greeting + one primary action → urgent deadlines with missing documents → next steps → recommended matches → application progress → announcements and alerts → profile completeness. No sidebars.

## Elevation & Depth

Iskolar is **ruled and flat**. Surfaces at rest sit flat on Counter Grey and are separated by a 1px Hairline border, tonal steps (Paper on Counter Grey, Ledger Tint headers), and whitespace. Depth exists only for things that float above the page and must be dismissed: menus, popovers, dialogs, sheets and toasts. In dark mode, resting surfaces have no shadow at all and overlays use a deeper, darker shadow.

### Shadow Vocabulary
- **Resting hairline** (`box-shadow: 0 1px 2px rgba(16,24,40,.06)`): the only shadow allowed on resting cards in light mode, barely perceptible. None in dark mode.
- **Overlay** (`box-shadow: 0 12px 32px rgba(16,24,40,.14)`; dark: `0 12px 32px rgba(0,0,0,.5)`): menus, dialogs, sheets, toasts.
- **Focus ring** (`outline: 2px solid primary; outline-offset: 2px`, inputs: `box-shadow: 0 0 0 3px primary-wash` + primary border): every focusable element. Never removed.

### Named Rules
**The No Lift At Rest Rule.** Hover changes the border to Strong Hairline or the fill to Hover Tint, never the shadow or position. Only overlays get the Overlay shadow.

## Shapes

Gently squared and steady: an official form with its corners softened just enough to feel approachable.

- **Small (6px):** buttons, inputs, selects, wizard choice tiles, notices, the date chip.
- **Medium (8px):** cards, criteria and document lists, provider tiles, the explore detail panel.
- **Large (12px):** dialogs and the top corners of mobile sheets.
- **Full:** pills and badges, filter chips, avatars, icon buttons, the unread count, step-number discs.
- Lists of criteria, documents and table bodies are one bordered container with hairline rules between rows (`overflow: hidden` on the container), never separate floating boxes per row.
- Provider marks are 44px Medium-radius tiles in the provider's own color with a 2–4 letter abbreviation in white (36px in compact lists, 60px on detail). Abbreviations are 12px bold. Four-letter ones (CHED, DOST, OWWA) are 11px with tight tracking so they fit the tile, the only use of 11px and the type floor.

## Components

### Buttons
Steady and unambiguous. They look like the thing you press at a counter.
- **Shape:** Small radius (6px), 44px tall (36px for `sm` inside dense rows), Label type.
- **Primary:** Civic Blue fill, white label. One per region (The One Blue Action Rule).
- **Outline:** Paper fill, Strong Hairline border, Ink label. Hover uses Hover Tint. A pressed toggle (`aria-pressed="true"`) uses the Civic Blue border and label on Blue Wash.
- **Text:** no chrome, Civic Blue label, underline on hover. Used for "Clear filters", "Mark all as read" and "Official page ↗".
- **Destructive:** Deadline Red fill and white label, only inside a confirmation dialog.
- **Focus:** the 2px Civic Blue outline with 2px offset. **Disabled:** 50% opacity, `cursor: not-allowed`, no hover change.
- **Loading:** label kept, a 16px spinner replaces the leading icon, button disabled. Width never jumps.

### Chips & Pills
- **Pill (status/meta):** Full radius, 26px tall, Caption type. Neutral is Ledger Tint with a Hairline border. Status variants are wash fill + strong ink with no border: ok / warn / danger / info. Amounts use the "strong" variant (Ink, 600). An icon is optional and 14px.
- **Filter chip:** Full radius, 36px tall (44px hit area on touch), Strong Hairline border. Selected is Civic Blue border + Blue Wash fill + Civic Blue label.
- **Counts:** the unread badge is a Deadline Red Full-radius disc with white 12px bold numerals and a 2px Paper ring.

### Cards / Containers
- **Corner Style:** Medium (8px).
- **Background:** Paper on Counter Grey.
- **Shadow Strategy:** resting hairline only (see Elevation).
- **Border:** 1px Hairline. Hover (on interactive cards) is Strong Hairline. Selected is a Civic Blue border + 1px Civic Blue ring.
- **Internal Padding:** 24 (16 below 640px). A card header row is separated by a Hairline rule.

### Inputs / Fields
- **Style:** Paper fill, 1px Strong Hairline border, Small radius, 44px tall, 16px Body text. The label sits above in Label type, 8px gap. Hint text in Caption Hint Ink sits between label and field.
- **Focus:** Civic Blue border + 3px Blue Wash ring.
- **Error:** Deadline Red border, with the message below in Caption Deadline Red, linked via `aria-describedby`, announced on submit. **Disabled:** Ledger Tint fill, Hint Ink text.
- **Choice tiles (wizard radios):** Small radius bordered tiles at 44px min height. Checked is Civic Blue border, inset ring, Blue Wash fill and Civic Blue 600 label.

### Navigation
- **Header (≥900px):** 64px Paper bar with a Hairline bottom border, sticky. Logo + "Iskolar" wordmark (19px, 700), then main links in Label type, Secondary Ink. The active link is Civic Blue with a 2px Civic Blue underline flush with the border. Right side: theme toggle, help, alerts bell with unread badge, account menu (avatar disc).
- **Bottom tab bar (<900px):** five equal tabs, 24px icons over 12px Caption labels, Hint Ink. Active is Civic Blue 600. Fixed, Paper, Hairline top border, safe-area padding.
- **Staff bar:** a 40px Night Registry Navy strip above the header on staff/admin routes ("Scholarship office view" plus a role label).
- **Tabs (in-page):** Label type, a 2px Civic Blue underline on the selected tab, with a count pill after each label. They scroll horizontally on overflow.

### Eligibility Criteria List (signature)
The explainable verdict, and the reason Iskolar exists.
- One bordered Medium-radius container, rows separated by Hairline, each row laid out as `[22px status disc] [label + explanation] [status word]`.
- **Met:** Approved Green disc with a white check, "Met" in green. **Not met:** Deadline Red disc with a white ×, explanation in red, "Not met". **Unknown:** Amber Wash disc with an amber ? and an amber 1px ring, "Unknown", plus an "Answer now" link. **Self-check:** Ledger Tint disc with a document glyph, "Self-check".
- Above the list sits a **verdict banner** (Small radius, status wash fill, status ink, 600). It reads "You meet all N requirements we can check" (yes), "You meet M of N. One answer is missing." (maybe), or "You don't meet N requirements" (no).
- Below it, always: "This is a preliminary check based on your answers, not an official decision. {Provider} makes the final call."

### Document Checklist (signature)
- One bordered list. Each row is a 44px+ label with an 18px checkbox, the document name (Title) and "Where to get it: …" (Body Small, Secondary Ink).
- Checked rows strike through the name in Hint Ink. A meter + "N of M ready" sits above the list. When everything is ready, the meter turns Approved Green.

### Deadline Date Chip
48px-wide Small-radius tile: a month strip (12px, 600, Ledger Tint) over the day number (18px, tabular). It turns urgent (Deadline Red month strip, white text) at ≤3 days.

### Toast
Toast Ink background, white 14px 500 text, a green check icon, Medium radius, Overlay shadow. Bottom-center (above the tab bar on mobile), `role="status"`, auto-dismisses after 3s, and has no motion under reduced motion.

## Do's and Don'ts

### Do:
- **Do** use only the spacing scale (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64) and keep the gap between groups at least twice the gap within them.
- **Do** keep exactly one filled Civic Blue button per region. Everything else is outline or text.
- **Do** show the source, "Last checked {date}" and verification status on every listing, and an amber "Not yet verified" notice before any document checklist on unverified listings.
- **Do** mark sample (seeded example) listings with the info "Sample listing" pill on cards and detail pages, plus an info notice on the detail page. A sample never shows "Verified", "Unverified" or "Last checked", and never counts as verified in landing numbers.
- **Do** keep the eligibility wording exactly: "You qualify", "Might qualify", "Not eligible right now", plus the preliminary-check disclaimer.
- **Do** color deadlines by The Urgency Ladder Rule (≤3 days red, ≤7 days amber).
- **Do** use tabular numerals for amounts, counts and dates that align.
- **Do** give every input a visible label, every icon button an `aria-label`, and every focusable element the Civic Blue focus ring.
- **Do** design dark mode alongside light, using the dark role table, never an automatic inversion.

### Don't:
- **Don't** use green, amber or red for anything but status.
- **Don't** add shadows to resting cards beyond the hairline shadow, and don't lift cards on hover.
- **Don't** use gradients, glass blur, colored left-border accent cards or tinted icon circles as decoration.
- **Don't** introduce font sizes outside the scale or weights outside 400/500/600/650/700.
- **Don't** put the navy band inside the app shell (dashboard, applications, settings). It belongs to public pages, auth and email headers.
- **Don't** use Tassel Gold anywhere but the logo.
- **Don't** animate layout, scroll-jack, or use motion that doesn't confirm a user action. Respect `prefers-reduced-motion` everywhere.
- **Don't** copy NerdWallet's greens or square buttons, or Mercury's violet pills or night chrome. They are references for rhythm and table discipline only.

## Agent Prompt Guide

**Taste dials (design-taste-frontend):** DESIGN_VARIANCE **3**, MOTION_INTENSITY **3**, VISUAL_DENSITY **4**. Calm, credible and readable. Motion only as feedback (≤200ms, ease-out, opacity/translate ≤4px). Density is moderate: generous between groups, compact inside rows.

**taste app style:** `editorial-greeting` (seed 1744512696, sheet in `.taste-skill/app/direction.json`), with palette and type kept. **Face chosen:** the dashboard greeting states today's one fact from the student's data ("Good morning, Ana. Tulong Dunong closes in 4 days and 3 documents are left."), never "Welcome back". **Signature element:** the explainable criteria list plus the document checklist with "where to get it". **Overrides of the sheet, from the build brief:** the shell keeps the prototype's header + bottom tab bar instead of the open-plane sidebar (brief §4.13), and the student dashboard is one 760px column instead of the 1100px 12-column grid (brief §4.12). Staff tables use the full 1200px container.

**References (for rhythm and discipline, not identity):** `reference/design-refs/nerdwallet.DESIGN.md` covers dense-but-readable comparison rows, hairline separation instead of shadow, weight-driven hierarchy, and label-above-value spec cells. `reference/design-refs/mercury.DESIGN.md` covers the 8px-based spacing rhythm, generous card padding, a single saturated action per view, and calm whitespace.

**Prompt seed for a new screen:** "Build {screen} for Iskolar following DESIGN.md: The Clear Counter. Inter, ruled and flat surfaces on Counter Grey, one Civic Blue primary action, status colors only for status, 4px spacing scale with the Proximity Rule, mobile-first from 360px with the bottom tab bar under 900px, light and dark themes, plain student English."
