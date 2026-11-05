# Design directions — Stage 1 (for approval)

All three are built as real pages with live data and the academy's own media at `/{en|ar}/design-preview/{a|b|c}` (staging only; 404 in production). Each shows the hero plus one representative section, in English and Arabic, desktop and mobile. Brand constants for all: logo unaltered, Royal Blue #2456D3, Deep Navy #101C3D, Turquoise #20C9CF, Inter / Cairo.

## A — Technical precision
- **Idea:** an engineering drawing. White sheet, an oversized headline set tight, and the lab photo annotated with hairline callouts pointing at what is really in it (trophy shelf, lab entrance, coding stations, reception kits).
- **Representative section:** "Find your path" — three age columns divided by hairlines, each listing real programs and prices.
- **Strengths:** calm, credible, most "big tech" in restraint; fastest (one image, no video).
- **Risks:** relies on the lab image — if it is a render it must be labelled or replaced; less emotional.
- **Performance:** best of the three.

## B — Cinematic
- **Idea:** the academy's real footage carries the page: a full-bleed silent competition loop under a navy veil, then a filmstrip of real competition photos, then a bento of student projects.
- **Strengths:** most emotional and authentic; shows real students and real robots immediately.
- **Risks:** depends entirely on consented student media; heaviest (video). Hero video must stay poster-first and pause off-screen (already does).
- **Performance:** needs care (poster as LCP, video lazy).

## C — Interactive learning
- **Idea:** the hero *is* the product — a program finder (age × track) filtering real published programs, followed by the learning journey Learn → Build → Compete with real photos.
- **Strengths:** most useful for parents; immediately shows prices and ages; works without JavaScript (links).
- **Risks:** busier first screen; depends on real program data being complete.
- **Performance:** good (small thumbnails).

## Recommendation
Combine **C's hero (finder) with A's typography and restraint**, and use **B's filmstrip/bento** further down once real consent is confirmed. Final choice is WadiTech's.


## Outcome

The owner chose a merge of the three directions ("professional and comfortable"): C's program finder in the hero, A's typography and annotated lab image, B's filmstrip and bento. It is implemented on the homepage and carried to all public pages; the preview routes were removed.
