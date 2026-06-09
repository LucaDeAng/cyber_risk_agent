# Architecture — AI-Mind

## 1. High-Level Flow di una Sessione Ipnotica

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE (Expo)                                  │
│                                                                             │
│  Onboarding ──▶ Bind device (Polar/Apple Watch) ──▶ Goal selection         │
│                                  │                                          │
│                                  ▼                                          │
│                       ┌─────────────────────┐                              │
│                       │ Session Player View │                              │
│                       │  - VU meter voce   │                              │
│                       │  - BPM live ring   │                              │
│                       │  - Pause/Skip      │                              │
│                       └────────┬────────────┘                              │
│                                │ WebSocket  /api/session/{id}/stream      │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                ┌────────────────┼──────────────────┐
                │  Bi-direzionale: client→server    │
                │  - audio chunks (Opus 16kHz)      │
                │  - BPM samples (1Hz)              │
                │  client←server                    │
                │  - TTS audio chunks (Opus)        │
                │  - phase events (induction→deepening→suggestion→awakening)
                └────────────────┬──────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (FastAPI async)                          │
│                                                                             │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    │
│   │ STT Stream       │───▶│ Hypnosis Engine  │───▶│ TTS Stream       │    │
│   │ Deepgram Nova-2  │    │ Claude opus-4-7  │    │ ElevenLabs v2    │    │
│   │ partial+final    │    │ + cached prompt  │    │ stream-input     │    │
│   └──────────────────┘    └────────┬─────────┘    └──────────────────┘    │
│                                    │                                       │
│   ┌──────────────────┐             ▼                                       │
│   │ Biometric        │   ┌────────────────────┐                            │
│   │ Aggregator       │──▶│ Adaptive Narrative │  modula:                  │
│   │ - BPM trend      │   │ State Machine      │  - tempo voce             │
│   │ - HRV proxy      │   │ (Markov + LLM)     │  - registro lessicale     │
│   └──────────────────┘   └────────┬───────────┘  - profondità trance      │
│                                   │                                       │
│                                   ▼                                       │
│                       ┌─────────────────────┐                             │
│                       │ Session Recorder    │  scrive in Supabase:       │
│                       │ (no audio raw!)     │  - transcript embeddings   │
│                       └─────────────────────┘  - biometric series        │
│                                                - phase transitions       │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (EU region)                                │
│                                                                             │
│   Postgres tables:                pgvector indexes:                         │
│   - users, profiles               - utterance_embeddings(dim 3072)         │
│   - sessions, session_phases      - phase_summary_embeddings               │
│   - biometric_samples            Row Level Security:                       │
│   - utterances (text only!)       - user can only read own rows           │
│   - knowledge_insights            - service_role bypass per analytics      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Adaptive Narrative State Machine

L'ipnosi non è free-form: ha **fasi cliniche** precise (Erickson + protocolli moderni).
Il motore implementa un *finite-state machine* dove ogni fase ha:

- script template generato dinamicamente da Claude
- exit-criteria biometrici
- fallback se utente non risponde / BPM non scende

```
   ┌─────────────┐     BPM trend ↓ stable ≥ 90s     ┌──────────────┐
   │ INDUCTION   │ ─────────────────────────────────▶│ DEEPENING    │
   │ (3-5 min)   │                                   │ (5-8 min)    │
   └──────┬──────┘                                   └──────┬───────┘
          │ utente parla > 8s                               │
          │  ─▶ adapt registro                              │ HRV proxy stable
          ▼                                                 ▼
   "I want to see future self"            ┌────────────────────────────┐
   ─▶ Hypnosis Engine includes goal       │ SUGGESTION + IMAGERY       │
   in subsequent prompts                  │ (15-20 min) — core valore  │
                                          └──────────┬─────────────────┘
                                                     │
                                                     ▼
                                          ┌────────────────────────────┐
                                          │ INTEGRATION                │
                                          │ (3-5 min)                  │
                                          └──────────┬─────────────────┘
                                                     │
                                                     ▼
                                          ┌────────────────────────────┐
                                          │ AWAKENING (1-2 min)        │
                                          └────────────────────────────┘
```

Codice: [`backend/app/services/adaptive_narrative.py`](../backend/app/services/adaptive_narrative.py)
e [`backend/app/services/hypnosis_engine.py`](../backend/app/services/hypnosis_engine.py).

---

## 3. Latency Budget

Per non rompere la trance, target end-to-end **<1.2s** dalla fine dell'utterance utente
all'inizio della risposta TTS.

| Step | Budget | Tecnologia |
|---|---|---|
| Mic capture → upload chunk | 100 ms | Expo AV + Opus encoder |
| Deepgram streaming STT (partial) | 200 ms | WebSocket |
| Claude TTFT (cached prompt!) | 350 ms | `cache_control: ephemeral` on system + KB context |
| TTS first chunk (ElevenLabs stream-input) | 350 ms | WebSocket simultaneo a Claude streaming |
| Network back to device | 100 ms | EU PoP |
| Decode + play | 50 ms | expo-av |
| **Totale** | **1.15 s** | |

Prompt caching Claude è obbligatorio (vedi `/claude-api` skill): system prompt + protocollo
fase corrente vengono cachati, riducendo costo del 90% e latency del 50%.

---

## 4. Data Flow & Privacy Boundaries

```
┌────────────────────────────────────────────────────────────────┐
│  DEVICE                                                        │
│  - Microfono → buffer locale (RAM only)                       │
│  - BPM samples → buffer locale                                │
└──────────────┬─────────────────────────────────────────────────┘
               │   TLS 1.3, mutual auth via JWT short-lived
               ▼
┌────────────────────────────────────────────────────────────────┐
│  BACKEND in-memory only (durata sessione):                     │
│  - audio raw chunks → STT → testo                              │
│  - testo → embedding (text-embedding-3-large)                  │
│  - audio raw DISCARDED (mai persistito)                        │
└──────────────┬─────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────┐
│  POSTGRES (long-term):                                         │
│  - utterance: TESTO + embedding (no audio)                     │
│  - biometric_samples: { ts, bpm, hrv_proxy } pseudonimizzati  │
│  - session metadata                                            │
└────────────────────────────────────────────────────────────────┘
```

Decision record: la voce raw è considerata biometric data Art.9 GDPR. Persistere
embeddings semantici + transcript (categorizzabili come "communications data") è
sufficiente per la Knowledge Base ed evita oneri AIA/DPIA pesanti.

---

## 5. Scalabilità

### 5.1 Fase MVP (0–10k MAU)
- 1× Railway service backend (autoscale 1-5 instances)
- Supabase Pro plan ($25 + usage)
- ElevenLabs Creator ($22/mese) + Anthropic pay-as-you-go
- Costo per sessione completa stimato: **€0.38** (vedi `docs/UNIT_ECONOMICS.md`, TBD)

### 5.2 Fase scaling (10k–500k MAU)
- Backend su Fly.io multi-region (EU + US)
- Postgres read replicas, partitioning su `sessions(created_at)`
- ElevenLabs Enterprise contract, Anthropic with prompt caching tier
- Costo per sessione: **€0.18** post-ottimizzazione caching

### 5.3 Fase enterprise (500k+ MAU)
- Vector store dedicato (Pinecone serverless o Vespa) staccato dal Postgres
- Kafka-style event bus per il dataset B2B pipeline
- Analytics warehouse su Snowflake/BigQuery con differential privacy layer

---

## 6. Sicurezza

- **JWT short-lived** (15 min) + refresh token rotativo (Supabase Auth)
- **Rate limiting** per IP + per user su `/session/start` (anti-abuse cost API)
- **Webhook verification** RevenueCat HMAC
- **Secret management**: Doppler o Railway secrets, mai in repo
- **Audit log**: tutte le mutazioni `users`, `profiles`, `b2b_exports` su tabella append-only
- **Disaster recovery**: PITR Supabase 7 giorni, snapshot settimanali off-region

---

## 7. Decisioni Architetturali Chiave (ADR)

| ADR | Decisione | Alternative considerate | Trade-off |
|---|---|---|---|
| 001 | FastAPI vs Node | Node/Express, Bun/Hono | Python ecosystem AI superiore, async maturo |
| 002 | Claude opus-4-7 vs GPT-5 vs Llama 3.1 | tutti testati | Empatia + adherence al protocollo nettamente migliori |
| 003 | Expo managed vs bare RN | bare RN, Flutter | Velocità OTA + 80% native APIs sufficienti |
| 004 | Supabase vs Firebase vs Neon+Clerk | tutti valutati | pgvector nativo + RLS + EU region |
| 005 | ElevenLabs vs OpenAI TTS vs Cartesia | A/B test in alpha | Voce per induzione di trance migliore con ElevenLabs |
| 006 | WebSocket vs SSE | entrambi | Bi-direzionale necessario per audio in+out, WebSocket vince |
