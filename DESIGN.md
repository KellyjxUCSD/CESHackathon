---
name: Equitable Living Utility
colors:
  surface: '#f7faf9'
  surface-dim: '#d7dbda'
  surface-bright: '#f7faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f3'
  surface-container: '#ebeeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e0e3e2'
  on-surface: '#181c1c'
  on-surface-variant: '#3c4a44'
  inverse-surface: '#2d3131'
  inverse-on-surface: '#eef1f0'
  outline: '#6c7a74'
  outline-variant: '#bbcac3'
  surface-tint: '#006b56'
  primary: '#006b56'
  on-primary: '#ffffff'
  primary-container: '#1cc29f'
  on-primary-container: '#004a3a'
  inverse-primary: '#49ddb9'
  secondary: '#ad3300'
  on-secondary: '#ffffff'
  secondary-container: '#fe642e'
  on-secondary-container: '#5a1700'
  tertiary: '#4e6073'
  on-tertiary: '#ffffff'
  tertiary-container: '#9baec4'
  on-tertiary-container: '#304254'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bfad4'
  primary-fixed-dim: '#49ddb9'
  on-primary-fixed: '#002018'
  on-primary-fixed-variant: '#005140'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59e'
  on-secondary-fixed: '#390b00'
  on-secondary-fixed-variant: '#842500'
  tertiary-fixed: '#d1e4fb'
  tertiary-fixed-dim: '#b5c8df'
  on-tertiary-fixed: '#091d2e'
  on-tertiary-fixed-variant: '#36485b'
  background: '#f7faf9'
  on-background: '#181c1c'
  surface-variant: '#e0e3e2'
  slate-body: '#485460'
  surface-card: '#FFFFFF'
  border-subtle: '#E5EBE8'
  mint-soft: '#E8F8F4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Final MVP direction

The supplied Explore and Calculator screenshots are the visual source of truth. The original token reference below is retained for context; the neutral screenshot palette takes precedence.

- **Keep the original structure.** A compact header, one straightforward heading, a search field, a few filters, and a vertical list of apartments.
- **Use plain language.** Say “Calculate rent split,” “Base monthly rent,” and “Show rent split.” Avoid slogans, decorative copy, and invented labels.
- **Stay neutral.** Near-white background (`#F9FAFB`), white cards, dark text and buttons (`#111827`), pale gray input rows (`#F3F4F6`), and subtle borders (`#E2E5EB`).
- **One font.** Plus Jakarta Sans for headings, labels, and numbers. No serif headlines or decorative illustrations.
- **Make the action visible.** Each apartment has a full-width “Calculate rent split” button. Show total rent and the two-person split together.
- **Calculator reference: Splitwise.** A centered three-step form: Rent → Rooms → Your split. Start with only rent and bedroom count. Keep bills and move-in costs inside an optional disclosure.
- **One room at a time.** Use room tabs, three plain size choices, and an occupancy selector. Exact sizes, bathrooms, windows, and closets stay in More room details. Shared spaces are optional. An equal per-person split is also available.
- **Secondary controls stay secondary.** Sorting and saved-only filtering are inside All filters. About and Privacy are short dialogs.
- **Support phones.** Apartment cards and form fields stack vertically. Room tabs can scroll without widening the page. Inputs retain labels and touch-friendly sizes. No horizontal page scrolling.
- **Be clear about the preview.** Property information and photos are examples. Calculations and saved apartments stay in this browser; shared links contain a copy of the plan.

## Original reference

### Brand & Style
The design system reflects a human-centered, tension-free financial utility engineered to eliminate friction and awkwardness in shared living. It addresses roommates, partners, and housemates negotiating rent and shared expenses. The aesthetic balances contemporary consumer-grade minimalism with an approachable, empathetic, and optimistic tone. 

The interface avoids cold, analytical spreadsheet patterns in favor of guided, step-by-step clarity. Generous whitespace, rounded geometry, and deliberate visual pacing replace cognitive overload with calm confidence. Every touchpoint feels light, transparent, and fair.

## Colors
The palette balances serene balance and decisive action:
- **Primary Teal (`#1CC29F`):** Anchors the brand identity, symbolizing fairness, financial clarity, and collaborative living. Used for active tabs, selected states, success metrics, and focused outlines.
- **Secondary Orange (`#FF652F`):** Provides warm, motivating contrast. Reserved exclusively for forward momentum, such as primary action buttons ("Calculate", "Next Step") and critical callouts.
- **Tertiary Slate (`#2C3E50`):** Provides anchor contrast for primary headlines and structural containers, avoiding stark black.
- **Neutral Canvas (`#F7FAF9`):** An airy, tinted off-white foundation that eliminates eye fatigue and frames bright white card containers cleanly.
- **Functional Slates (`#485460`, `#E5EBE8`):** Support text readability without visual heaviness and provide soft, low-contrast structural boundaries.

## Typography
Plus Jakarta Sans serves as the single typographic family across display, body, and UI labels. Its geometric foundations and gently curved apertures project warmth, approachability, and high legibility.

Key typographic rules:
- **Headlines:** Use heavy weights (`700`, `800`) paired with subtle negative letter spacing to create cohesive, inviting section headers.
- **Numbers & Calculation Results:** Always render currency values and totals in semibold or bold weights with tabular figures enabled (`font-variant-numeric: tabular-nums`) to prevent shifting layouts during recalculation.
- **Body Text:** Use regular weights (`400`) in slate gray (`#485460`) to maintain a soft contrast against `#FFFFFF` surfaces.

## Layout & Spacing
The layout relies on a focused single-column or compact multi-column container approach rather than full-width dashboards. 

- **Desktop (min-width: 1024px):** A constrained central card container with a maximum width of `680px` to `760px` centered on the viewport. This concentrates attention directly on step-by-step calculations without peripheral distractions.
- **Tablet (768px – 1023px):** Fluid layout within an 8-column grid with `2rem` outer margins.
- **Mobile (< 768px):** Single-column vertical stack with `1rem` margins and `1rem` gutters. Interactive actions dock to a sticky bottom bar above safe areas for effortless thumb access.
- **Vertical Spacing Rhythm:** Card modules are separated by generous `space-xl` gaps to maintain an uncluttered atmosphere. Form fields maintain `space-md` gaps between labels, inputs, and helper messages.

## Elevation & Depth
Depth relies on soft tonal layers, crisp micro-borders, and diffused ambient illumination:
- **Ground Layer:** Clean tinted canvas (`#F7FAF9`).
- **Surface Layer (Cards & Panels):** Solid `#FFFFFF` elevated with a continuous border (`1px solid #E5EBE8`) and an ambient shadow: `0 8px 30px rgba(44, 62, 80, 0.04)`.
- **Active / Interactive Elements:** Step modules and selected room/roommate cards elevate slightly on hover with a smooth transition to `0 12px 36px rgba(28, 194, 159, 0.08)` and a border shift to `#1CC29F`.
- **Dropdowns & Modals:** Floated at higher elevation with `0 20px 48px rgba(44, 62, 80, 0.10)`. No harsh drop shadows or dark skeuomorphic bevels are permitted.

## Shapes
Geometry uses welcoming, soft contours:
- Standard interactive elements (cards, text input fields, and modular panels) apply `roundedness: 2` (base border-radius of `0.5rem` / `8px` up to `1rem` / `16px` for `rounded-lg`).
- Utility tags, selection pills, step badges, and standalone calculation triggers use full pill geometries (`rounded-full` / `9999px`) to reinforce playfulness and tactile clarity.
- Micro-dividers and slider tracks use fully rounded end-caps.

## Components

### Buttons
- **Primary Action:** Solid Orange (`#FF652F`) with white text, pill-shaped (`rounded-full`), padded `0.875rem 2rem`. Subtle hover state shifts to brightness 105% with a soft orange glow: `box-shadow: 0 8px 20px rgba(255, 101, 47, 0.25)`.
- **Secondary Action:** Mint Soft (`#E8F8F4`) fill with Primary Teal text (`#1CC29F`), borderless, rounded-full.
- **Tertiary / Ghost:** Transparent background with slate text (`#485460`), shifting to subtle neutral tint on hover.

### Input Fields & Steppers
- **Currency & Text Inputs:** Crisp `#FFFFFF` surface with `#E5EBE8` border, height `52px`, `rounded-lg` (`1rem`). Large, bold text (`18px`) for immediate legibility. On focus: border shifts cleanly to `#1CC29F` with an extra-soft outer ring (`box-shadow: 0 0 0 4px rgba(28, 194, 159, 0.15)`).
- **Number Steppers (+ / -):** Pill-shaped input groups with circular button caps.

### Chips & Roommate Badges
- **Selection Chips:** Pill-shaped (`rounded-full`), border `1.5px solid #E5EBE8`, background `#FFFFFF`. Active state transitions to `#1CC29F` border and `#E8F8F4` fill with bold teal text.

### Cards & Container Panels
- Single-focus step cards surfaced in `#FFFFFF`, with `1.5rem` to `2.5rem` interior padding, rounded to `1rem` (`rounded-lg`), bounded by soft slate outlines. Each card handles one explicit sub-task (e.g., "Total Rent", "Room Details", "Split Summary").

### Checkboxes & Radio Toggles
- Custom `24px` circles and rounded squares. Checked state fills with `#1CC29F` displaying an animated white checkmark.

### Sliders (Rent Weights & Dimensions)
- Height `8px` track with `#E5EBE8` fill and `#1CC29F` progress fill. The grab thumb is an oversized `28px` circle with a solid `#FFFFFF` surface, `#1CC29F` border (`3px`), and low ambient drop shadow for accessible drag control.
