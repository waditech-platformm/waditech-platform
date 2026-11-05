# Design system

Distinctive WadiTech identity built from the official assets — not copied from any other platform.

## Brand assets (supplied by the academy — used as-is, never redrawn)
| File | Source | Used in |
|---|---|---|
| `public/media/brand/logo-original.png` | Official logo (glowing WT mark + robot head, "LEARN · BUILD · INNOVATE") | Homepage hero, About |
| `logo-official.png` (+ `-512`, `-192`) | The official logo with only the outer dark margin trimmed (pixel crop of `logo-original.png`; no recolour, no redraw) | Header, footer, certificates, favicon |
| `lab-entrance.webp` (+ `-md`) | Supplied image: WadiTech Kids Robotics Lab entrance | Homepage hero, Open Graph image, About |
| `lab-classroom.webp` (+ `-md`) | Supplied image: lab coding stations | Homepage "Why WadiTech", sign-in/register panel, About |
| `public/media/photos/*` (27 photos, 2 sizes) | Academy photos from the supplied WhatsApp archives (competitions, classroom, projects) | Program covers, Learning in Action, Gallery, Competitions |
| `public/media/videos/clip-*.mp4` + posters | Short clips transcoded from the supplied archives, with generated poster frames | Learning in Action, Gallery |

> The owner confirmed (5 Nov 2026) that both lab images are real photographs and that parental consent exists for the student photos and videos. Earlier derived files (`logo-square`, `logo-mark*`) were removed: one was a zoomed crop and the other had altered colours from background removal. Only the official logo is used, and the header shows it as the logo itself (no re-typeset wordmark).

## Colour tokens (`app/globals.css`, Tailwind 4 `@theme`)
All brand colours are sampled from the official logo (cyan → azure gradient on deep navy). Exact logo hues are kept for accents; darker steps of the same hues are used wherever text must meet WCAG AA.

| Token | Hex | Role |
|---|---|---|
| `cyan-500` | `#00C6E0` | Logo cyan (the "W") — accents, highlights on dark, accent buttons with navy text |
| `royal-500` | `#0089EB` | Logo azure (the "T", "TECH") — decorative and large elements |
| `royal-600` / `royal-700` | `#006BBD` / `#005A9E` | Logo azure darkened for AA: primary buttons, links, focus (5.5:1 and 7.1:1 on white) |
| `cyan-600` | `#00869A` | Logo cyan darkened: large text and icons on white |
| `navy-950` / `navy-900` | `#041228` / `#0A1A36` | From the logo's robot face — header, dark sections, footer, headings |
| `ink` / `muted` / `subtle` | `#0E1630` / `#4A5578` / `#586283` | Text hierarchy (all ≥ 4.5:1 on white) |
| `surface` / `card` / `line` | `#F5F7FB` / `#FFFFFF` / `#E3E8F2` | Backgrounds and borders |
| `success` / `warning` / `danger` (+ `-bg`) | `#0B6B4A` / `#7F5200` / `#B42B31` | Status; darkened to pass AA on their tinted backgrounds (axe-verified) |

Gradients are used sparingly (hero only) with a subtle neural-grid pattern; no decorative humanoid robots are drawn by the UI.

## Typography
- **English:** Inter Variable · **Arabic:** Cairo Variable — both self-hosted via Fontsource (no third-party font requests).
- `html[lang=ar]` switches the font stack; Latin technical strings (code, prices, certificate numbers, emails) use `.font-latin` and `dir="ltr"` inside Arabic pages.
- Scale: display 40–56 px (hero), h1 28–36, h2 22–28, body 16, small 14, caption 12. Line-height 1.6 for body, 1.15 for display.

## Layout & spacing
`Container` max-width 1280 px with 16 px mobile gutters; 4-px spacing scale; `--radius-card` 1.5 rem; shadows `--shadow-card` and `--shadow-lift` (hover). Breakpoints tested at 360/390/768/1024/1440.

## Components (`components/ui`)
`Button` (primary, secondary, ghost, danger; sm/md/lg; loading state), `Card`, `Badge` (neutral, blue, cyan, success, warning, danger, dark), `Alert`, `EmptyState`, `ProgressBar`, `Stat`, `Table/Td`, `DemoBadge`, form controls (`Input`, `Select`, `Textarea`, `Label`) and `ActionForm`/`SubmitButton`/`FieldError` that wire Server Actions with pending, success and error states. Layout: `SiteHeader` (announcement bar, mobile menu), `SiteFooter`, `PortalShell` + `PortalNav` for dashboards, `AuthShell`, `LanguageSwitcher`.

## Interaction & accessibility rules
- Visible focus rings (`ring-4 ring-royal-100`), skip-to-content link, `aria-current` in navigation, `aria-expanded` on menus, Escape closes the mobile menu.
- Every icon-only control has an accessible name; accessible names include the visible text (axe `label-content-name-mismatch`).
- Touch targets ≥ 40 px; motion limited to short transitions and hover lift.
- Logical CSS properties (`ms-`, `me-`, `start-`, `end-`) so layouts mirror automatically in RTL; directional icons flip in Arabic.
