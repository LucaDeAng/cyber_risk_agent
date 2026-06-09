# Roadmap — AI-Mind

## Fase 0 — MVP (Settimane 0–4) — questo repo

**Goal**: una sessione ipnotica di 5 minuti dimostra il loop completo (voce↔Claude↔TTS↔BPM mock).

- [x] Repo scaffold (mobile + backend + supabase + docs)
- [x] Auth Supabase con email + magic link
- [x] Schermata onboarding (3 step)
- [x] Schermata "Home" con BPM mock + start session
- [x] Sessione 5 min: dialogo Claude streaming + ElevenLabs TTS
- [x] Backend FastAPI con WebSocket `/session/stream`
- [x] Hypnosis Engine con 3 fasi (induction, suggestion, awakening)
- [x] Knowledge Base schema in Supabase (utterances + embeddings + biometric_samples)
- [x] CI: ruff + pytest backend, eslint + tsc mobile
- [ ] Demo video 90s

## Fase 1 — Closed Beta (Settimane 4–8)

**Goal**: 50 testers internal, BPM reale, 30 min sessions.

- [ ] Integrazione Apple HealthKit (BPM live + HRV)
- [ ] Integrazione Polar H10 via BLE
- [ ] State machine 5 fasi completa (induction, deepening, suggestion, integration, awakening)
- [ ] 3 protocolli: `sleep`, `focus_recovery`, `layoff_resilience`
- [ ] Pre-session questionnaire (PHQ-9 lite, screening rischio)
- [ ] Post-session reflection (free text + sentiment)
- [ ] Prompt cache Claude attivo
- [ ] Latency budget verificato <1.2s
- [ ] TestFlight beta deployment
- [ ] Analytics PostHog event taxonomy
- [ ] Crisis handoff: numeri verdi se PHQ-9 score critico

## Fase 2 — Public Launch (Settimane 8–14)

**Goal**: live su iOS + Android stores, prima cohort paying.

- [ ] Integrazione RevenueCat (subscription IAP)
- [ ] Paywall design + A/B testing infrastructure
- [ ] Onboarding voce-first (no typing)
- [ ] Multilingua: IT, EN, ES, DE, FR (prompt + TTS voices)
- [ ] App Store + Play Store submission (con disclaimer medical)
- [ ] Landing page + waitlist
- [ ] Creative pipeline TikTok/Meta (AI-gen testimonials)
- [ ] CRM lifecycle (Customer.io o Braze)
- [ ] In-app referral
- [ ] Dashboard founder KPI (DAU, TCR, churn cohort)

## Fase 3 — Knowledge Base v1 (Settimane 14–24)

**Goal**: il dataset proprietario diventa attivo, primi insight per utente.

- [ ] Pipeline embedding utterances (text-embedding-3-large)
- [ ] Clustering tematico (BERTopic) on subconscious patterns
- [ ] Personal Insight Dashboard in-app ("Le tue 3 paure ricorrenti")
- [ ] Aggregated trends dashboard (founder-only)
- [ ] First B2B pilot: insurance partner (Italy)
- [ ] Differential privacy noise layer su exports
- [ ] Data Processing Agreement template (GDPR Art.28)
- [ ] IRB-ready research extract format

## Fase 4 — Defensibility & Enterprise (Settimane 24–52)

**Goal**: trasformazione in piattaforma B2B2C.

- [ ] Corporate dashboard (SSO SAML, aggregate analytics)
- [ ] HRIS integrations (Workday, BambooHR)
- [ ] White-label option per insurance/EAP
- [ ] Patent applications su Biometric-Verbal Mapping
- [ ] Scientific Advisory Board (5 clinici + 2 academic)
- [ ] First peer-reviewed paper submission
- [ ] Series A round
- [ ] EU expansion: localization + EU data residency contractual lock-in
- [ ] US launch with HIPAA-ready infrastructure

## Fase 5 — Visione 18+ mesi

- Hardware partnership: custom EEG headband co-branded (vs Muse)
- Integration con Apple Vision Pro / Meta Quest per *deep immersion*
- Therapist marketplace: AI-Mind come strumento, terapeuti umani per follow-up critici
- Acquisizione potenziale o IPO se Knowledge Base raggiunge 50M+ sessioni
