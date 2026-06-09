# AI-Mind — Generative Hypnosis Against Burnout

> **"Trasformare il caos del mercato in frequenze guidate dall'intelligenza artificiale."**
>
> AI-Mind è una piattaforma di **ipnosi adattiva generativa**: l'AI conduce sessioni di
> 30 minuti personalizzate sul battito cardiaco e sulla voce dell'utente, con l'obiettivo
> di indurre stati di trance profonda per il recupero da burnout, ansia da layoff e
> stress da disruption tecnologica.

---

## 1. La Tesi in 60 Secondi

| Pillar | Sintesi |
|---|---|
| **Mercato** | Mental-health tech vale ~$7B (2026e) e cresce >25% YoY. Il segmento *high-net-worth in layoff tech* è il "white space": demografia ad alto spending mai prima così esposta a burnout. |
| **Prodotto** | Non un'app di meditazione passiva (Calm/Headspace) ma un **AI Hypnosis Protocol**: dialogo vocale adattivo, narrative engine che riscrive lo script in tempo reale sulla base di BPM + risposte verbali. |
| **Moat** | (1) Mapping biometrico ↔ stimolo verbale ↔ risposta autonoma. (2) Knowledge base proprietaria del subconscio in trance — la "miniera d'oro" rivendibile in B2B/Big Tech assicurativo. |
| **Modello** | Freemium con sessioni illimitate a €19,99/mo. Acquisizione B2C aggressiva (TikTok/Meta night-time targeting). Defensibility B2B via licensing dataset → settore clinico, insurance, HR. |

Vedi [`docs/MARKET_ANALYSIS.md`](docs/MARKET_ANALYSIS.md) per il deep-dive.

---

## 2. Monorepo Layout

```
ai-mind/
├── mobile/              # React Native + Expo (iOS/Android client)
├── backend/             # FastAPI orchestrator (AI/audio/biometrics)
├── supabase/            # Postgres schema + RLS + pgvector
├── docs/                # Strategy, architecture, roadmap, data
└── .github/workflows/   # CI: lint + typecheck + tests
```

## 3. Stack Tecnologico

| Layer | Scelta | Motivazione |
|---|---|---|
| Mobile | Expo SDK 51 + expo-router + TypeScript | Time-to-market, OTA updates, file-based routing |
| Voice in | Whisper API (large-v3) o Deepgram Nova-2 streaming | <500 ms latency, italiano nativo |
| AI Orchestrator | **Claude API — `claude-opus-4-7` (cached system prompt)** | Empatia conversazionale, instruction following, 1M context per long sessions |
| Voice out | ElevenLabs (Eleven Multilingual v2) o OpenAI TTS HD | Voce realistica per induzione di trance, multilingua |
| Backend | FastAPI + Python 3.12 (async) | Streaming SSE per audio progressivo, ecosystem AI maturo |
| DB | Supabase (Postgres + pgvector + Auth + RLS) | Vector search per Knowledge Base, auth pronta, RLS GDPR-friendly |
| Biometrics | expo-health (HealthKit/Health Connect) + react-native-ble-plx (Polar H10/Apple Watch) | BPM real-time, HRV per profondità trance |
| Audio FX | expo-av + ffmpeg-kit | Binaural beats di sottofondo, ducking voce/musica |
| Pagamenti | RevenueCat | Subscription cross-platform |
| Analytics | PostHog (self-host EU) | GDPR, session replay opzionale |
| Hosting | Backend: Railway / Fly.io. Mobile: EAS Build + Submit | DX, EU regions per data residency |

Vedi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) per i diagrammi.

---

## 4. Quick Start

### Modalità "zero-config" (consigliata per il primo avvio)

L'MVP gira **senza nessuna chiave API**. Il sistema rileva automaticamente i provider mancanti e attiva i fallback:

| Manca | Fallback attivo |
|---|---|
| `ANTHROPIC_API_KEY` | `ScriptedHypnosisEngine` — 15 script per fase × protocollo, hardcoded |
| `ELEVENLABS_API_KEY` | `NullTTSStreamer` lato server + `expo-speech` lato client |
| `DEEPGRAM_API_KEY` | STT disattivato (puoi inviare `user_utterance` come testo) |
| `SUPABASE_URL` | `InMemoryKnowledgeBase` + sessioni in-process + auth ospite |

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Mobile (in un altro terminale)
cd mobile
npm install
npx expo start
```

Premi `i` per iOS Simulator, `a` per Android Emulator. Niente `.env` necessario.

### Modalità "live" (per closed beta in poi)

Quando vuoi voci ElevenLabs reali, dialogo Claude adattivo e persistenza Supabase:

```bash
cp .env.example .env
# popola le 4 chiavi: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, DEEPGRAM_API_KEY,
# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY
```

L'avvio rileva automaticamente le chiavi presenti — non c'è un toggle manuale.

### Database (solo modalità live)
```bash
cd supabase
supabase db push   # applica supabase/migrations/0001_init.sql
```

### Prerequisiti
- Node.js 20+, npm o pnpm
- Python 3.12+
- iOS Simulator (Xcode) o Android Studio per testare il mobile

---

## 5. Skills Claude Code consigliate

Per chi sviluppa con Claude Code, queste skill velocizzano il flusso:

- **`/claude-api`** — già attiva nel progetto; usala per ogni modifica al motore conversazionale (`backend/app/services/hypnosis_engine.py`). Garantisce prompt caching e best practice Anthropic SDK.
- **`/verify`** — dopo ogni cambiamento UX, fa partire l'app e valida visivamente la sessione ipnotica.
- **`/security-review`** — obbligatoria prima di ogni release: dati biometrici + voce sono PII sensibili (GDPR Art. 9).
- **`/code-review`** — pre-merge sulla branch di feature.
- **`/run`** — per lanciare rapidamente Expo o FastAPI senza ricordare i comandi.

---

## 6. Roadmap (alto livello)

| Fase | Settimane | Deliverable |
|---|---|---|
| **0 — MVP** (questo repo) | 0–4 | Sessione 5 min, dialogo Claude + TTS, BPM mock, auth, 1 schermata onboarding |
| **1 — Closed Beta** | 4–8 | BPM reale (Apple Watch + Polar), 30 min sessions, 3 protocolli (sleep / focus / layoff-recovery) |
| **2 — Public Launch** | 8–14 | RevenueCat, iOS+Android su store, A/B test creative TikTok/Meta, 5 lingue |
| **3 — Knowledge Base v1** | 14–24 | Embedding subconscious patterns, dashboard insight per utente, primo cliente B2B (insurance pilot) |
| **4 — Defensibility** | 24–52 | Brevetti su Biometric-Verbal Mapping, expansion: corporate wellness (Enterprise SSO + analytics aggregate) |

Vedi [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 7. Privacy & Etica

L'intera architettura è progettata per essere **privacy-by-design**:
- Audio voce **mai persistito** in chiaro — solo embedding semantici anonimi nella Knowledge Base.
- BPM e HRV salvati con `user_id` pseudo-anonimizzato (UUID, mai email/nome).
- Right to be forgotten implementato a livello DB (cascade delete).
- Modello B2B opera solo su **dataset aggregati e differential-privacy noised**.
- Disclaimer chiaro: AI-Mind **non è un dispositivo medico** — supporto al benessere, non terapia.

Dettagli in [`docs/DATA_STRATEGY.md`](docs/DATA_STRATEGY.md).

---

## 8. Licenza

Proprietary — All rights reserved. Codice di proprietà dell'organizzazione fondatrice.
Discussioni di licensing B2B: aprire issue con tag `licensing`.
