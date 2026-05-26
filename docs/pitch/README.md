# AI-Mind — Pitch Deck

10-slide investor deck built with reveal.js. Single HTML file, no build step.

## View

Open `index.html` directly in any browser:

```bash
open docs/pitch/index.html      # macOS
xdg-open docs/pitch/index.html  # Linux
```

Or serve via any static server:

```bash
python3 -m http.server -d docs/pitch 8080
# → http://localhost:8080
```

## Export to PDF

Reveal.js ships a print-to-PDF mode. Open the deck with `?print-pdf` in
Chrome/Chromium, then use the browser's print dialog → **Save as PDF**.

```
http://localhost:8080/?print-pdf
```

Recommended print settings:
- Layout: Landscape
- Margins: None
- Background graphics: ON
- Paper size: A4 landscape or 16:9 (1280×720) for slide decks

## Edit copy

All copy lives in `index.html`. Numbers (€2.5M, 530k layoffs, 67%, etc.) are
mirrored from `docs/MARKET_ANALYSIS.md` and `docs/ROADMAP.md` — keep them in
sync if you update the deck.

## Theme

`theme.css` is a bespoke reveal theme matching the mobile app palette
(`mobile/constants/theme.ts`) and the landing page (`landing/tailwind.config.ts`).
If you change brand colours in one place, update the other two.

## Slides

1. **Title** — name, tagline, ask amount
2. **The pain** — three statistics (530k, 67%, $0)
3. **The insight** — three converging waves
4. **The product** — four pillars (AI conducts, BPM steers, 28 min, future self)
5. **Demo** — phone mockup with adaptive verbatim echo
6. **Market** — TAM/SAM table with AI-native row highlighted
7. **Business model** — B2C vs B2B knowledge base
8. **Defensibility** — 4-step flywheel diagram
9. **Roadmap** — 5 phases with milestones + spend
10. **The ask** — €2.5M, use of funds, contact
