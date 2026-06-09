# AI-Mind — Landing Page

Sito waitlist Next.js 14 (App Router) + Tailwind. Hero, problema, soluzione,
protocolli, CTA. Form raccoglie email + ruolo (segmenta i layoff dai curious).

## Run

```bash
cd landing
npm install
npm run dev
# → http://localhost:3000
```

## Build

```bash
npm run build && npm start
```

## Deploy

### Vercel (consigliato)
```bash
npx vercel --prod
```

### Netlify
```bash
npx netlify deploy --prod --dir=.next
```

## Endpoint waitlist

`POST /api/waitlist` accetta `{ email, role }`, valida, e (per ora) scrive in
`landing/data/waitlist.jsonl`. In produzione: aggiungi una migration
`supabase/migrations/0002_waitlist.sql` e abilita il forward al DB. Per
trasformarlo in funnel ADV-grade, fan-out a Customer.io / Loops via webhook.

## Copy

Il copy è ricavato da `../docs/MARKET_ANALYSIS.md`. Per i test creative
TikTok/Meta: usa le tre statistiche della sezione "Il momento" come hook visuali.
