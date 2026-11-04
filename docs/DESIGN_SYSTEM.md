# Design system

Distinctive WadiTech identity built from the official assets — not copied from any other platform.

## Brand assets (supplied by the academy — used as-is, never redrawn)
| File | Source | Used in |
|---|---|---|
| `public/media/brand/logo-original.png` | Official logo (glowing WT mark + robot head, "LEARN · BUILD · INNOVATE") | Homepage hero, About |
| `logo-square.png`, `logo-mark.png`, `logo-mark-sm.png` | Crops/resizes of the same logo (no redrawing) | Header, favicon, footer, certificates |
| `lab-entrance.webp` (+ `-md`) | Supplied image: WadiTech Kids Robotics Lab entrance | Homepage hero, Open Graph image, About |
| `lab-classroom.webp` (+ `-md`) | Supplied image: lab coding stations | Homepage "Why WadiTech", sign-in/register panel, About |
| `public/media/photos/*` (27 photos, 2 sizes) | Academy photos from the supplied WhatsApp archives (competitions, classroom, projects) | Program covers, Learning in Action, Gallery, Competitions |
| `public/media/videos/clip-*.mp4` + posters | Short clips transcoded from the supplied archives, with generated poster frames | Learning in Action, Gallery |

> The two lab images look like architectural concept renders. If they are visualisations rather than photos of the finished lab, label them accordingly before launch (prompt rule: no claims that aren't real). Photos showing students are published only with recorded parental consent.

## Colour tokens (`app/globals.css`, Tailwind 4 `@theme`)
| Token | Hex | Role |
|---|---|---|
| `navy-900` | `#101C3D` | Deep Navy — header, hero, footer, headings |
| `navy-950` | `#0A1229` | Darkest surfaces |
| `royal-600` | `#2456D3` | Royal Blue — primary actions, links, focus |
| `cyan-500` | `#20C9CF` | Turquoise — accents, highlights on dark |
| `ink` / `muted` / `subtle` | `#0E1630` / `#4A5578` / `#586283` | Text hierarchy (all ≥ 4.5:1 on white) |
| `surface` / `card` / `line` | `#F5F7FB` / `#FFFFFF` / `#E3E8F2` | Backgrounds and borders |
| `success` / `warning` / `danger` (+ `-bg`) | `#0B6B4A` / `#7F5200` / `#B42B31` | Status; darkened to pass AA on their tinted backgrounds (axe-verified) |

Gradients are used sparingly (hero only) with a subtle neural-grid pattern; no decorative humanoid robots are drawn by the UI.

## Typography
- **English:** Inter Variable · **Arabic:** Cairo Variable — both self-hosted via Fontsource (no third-party font requests).
- `html[lang=ar]` switches the font stack; Latin technical strings (code, prices, certificate numbers, emails) use `.font-latin` and `dir="ltr"` inside Arabic pages.
- Scale: display 40–56 px (hero), h1 28–36, h2 22–28, body 16, small 14, caption 12. Line-height 1.6 for body, 1.15 for display.

## Layout & spacing
`Container` max-width 1280 px with 16 px mobile gutters; 4-px spacing scale; `--radius-card` 1 rem; shadows `--shadow-card` and `--shadow-lift` (hover). Breakpoints tested at 360/390/768/1024/1440.

## Components (`components/ui`)
`Button` (primary, secondary, ghost, danger; sm/md/lg; loading state), `Card`, `Badge` (neutral, blue, cyan, success, warning, danger, dark), `Alert`, `EmptyState`, `ProgressBar`, `Stat`, `Table/Td`, `DemoBadge`, form controls (`Input`, `Select`, `Textarea`, `Label`) and `ActionForm`/`SubmitButton`/`FieldError` that wire Server Actions with pending, success and error states. Layout: `SiteHeader` (announcement bar, mobile menu), `SiteFooter`, `PortalShell` + `PortalNav` for dashboards, `AuthShell`, `LanguageSwitcher`.

## Interaction & accessibility rules
- Visible focus rings (`ring-4 ring-royal-100`), skip-to-content link, `aria-current` in navigation, `aria-expanded` on menus, Escape closes the mobile menu.
- Every icon-only control has an accessible name; accessible names include the visible text (axe `label-content-name-mismatch`).
- Touch targets ≥ 40 px; motion limited to short transitions and hover lift.
- Logical CSS properties (`ms-`, `me-`, `start-`, `end-`) so layouts mirror automatically in RTL; directional icons flip in Arabic.
