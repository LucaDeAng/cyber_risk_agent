# Data Strategy — AI-Mind

## 1. Principio: privacy come vantaggio competitivo, non come vincolo

Il dataset proprietario è l'asset più prezioso, ma è anche **il più sensibile** legalmente.
La nostra strategia: usare la conformità GDPR Art.9 e l'AI Act EU come *moat*, non come costo.

Un competitor americano che vuole entrare in EU dovrà rifare tutto il legal framework.
Noi nasciamo EU-first.

## 2. Tassonomia dei dati

| Categoria | Esempi | Trattamento | Persistenza |
|---|---|---|---|
| **Identificativi** | email, nome, device id | Cifrati a riposo, accesso solo via RLS | Fino a cancellazione account |
| **Biometrici (Art.9)** | BPM, HRV samples | Pseudonimizzati con UUID di sessione, mai linkati a identificativi all'interno dello stesso schema | Aggregati dopo 90 giorni |
| **Voice raw** | audio file PCM/Opus | **MAI PERSISTITO** — solo in memoria backend durante sessione | 0 secondi (in-memory) |
| **Voice transcript** | testo trascritto | Persistito a livello utterance | Persistente, soggetto a delete |
| **Embedding semantici** | vector 3072-dim | Persistiti per Knowledge Base | Persistente, anonimizzabili |
| **Stato emotivo dedotto** | sentiment, trance depth score | Derived, persistito | Persistente |
| **Sessione metadata** | start/end, fase transitions | Persistito | Persistente |

## 3. Knowledge Base — Architettura del valore

```
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 1 — Raw Session Data (user-bound, RLS-locked)          │
│  ↓                                                                │
│  - utterances (text + embedding) → user_id                       │
│  - biometric_samples → user_id                                   │
│  - session_phases → user_id                                      │
└──────────┬───────────────────────────────────────────────────────┘
           │  pipeline notturna (Airflow / Dagster eventually)
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 2 — Insight Personali (user-bound)                      │
│  ↓                                                                │
│  - personal_themes (cluster di temi ricorrenti)                  │
│  - resilience_trajectory (trend trance depth, sleep, recovery)   │
│  - recommended_protocols                                         │
└──────────┬───────────────────────────────────────────────────────┘
           │  aggregation + differential privacy
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 3 — Knowledge Base Aggregata (no PII, anonima)         │
│  ↓                                                                │
│  - subconscious_pattern_clusters (BERTopic topics aggregati)     │
│  - biometric_response_curves (BPM curves su stimuli categorici)  │
│  - cohort_insights (per ruolo / settore / trigger)               │
└──────────┬───────────────────────────────────────────────────────┘
           │  contractual export with DPA
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 4 — B2B Products                                       │
│  - Insurance Risk API                                           │
│  - Enterprise Mental Health Benchmarks                          │
│  - Pharma Cohort Recruiting                                     │
└──────────────────────────────────────────────────────────────────┘
```

Solo il livello 3+ è "vendibile". Livelli 1-2 restano cifrati e mai esposti.

## 4. Differential Privacy

Per ogni export verso un cliente B2B:

- **k-anonymity ≥ 50**: nessun gruppo restituito ha meno di 50 utenti
- **Gaussian noise** ε=1.0 su tutti i valori numerici aggregati
- **Suppression**: campi rari (frequenza <0.5%) rimossi
- **Audit log**: ogni export firma criptograficamente la query

Libreria: [Google Differential Privacy](https://github.com/google/differential-privacy)
o OpenDP, evaluation in Fase 3.

## 5. Diritti dell'Utente (GDPR)

| Diritto | Implementazione | Endpoint |
|---|---|---|
| Accesso | Export JSON di tutti i dati personali | `GET /api/me/export` |
| Rettifica | Editing profilo + scrub utterance specifica | `PATCH /api/me`, `DELETE /api/utterances/{id}` |
| Cancellazione | Cascade delete su tutto lo schema | `DELETE /api/me` |
| Portabilità | Export JSON + bundle audio (se richiesto entro 30g) | `GET /api/me/export?include_audio=true` |
| Opposizione | Opt-out dalla Knowledge Base aggregata | settings toggle, propagation entro 30g |

Tabella `data_subject_requests` per traccia compliance.

## 6. AI Act EU (in vigore 2026)

AI-Mind ricade in **categoria limited risk** (sistema AI per benessere, non
diagnosi clinica) ma può sconfinare in **high risk** se rivendichiamo capacità
diagnostiche.

Linee guida interne:
- Mai claim "diagnoses depression" o simili
- Sempre disclaimer "complemento al benessere, non terapia"
- Documenting su `docs/AIA_RISK_ASSESSMENT.md` (TBD)
- Bias testing: prompt evaluation suite su 8 gruppi demografici (Fase 1)

## 7. Data Retention Policy

| Dato | Default | User-configurable | Anonimizzazione auto |
|---|---|---|---|
| Account info | account life | n/a | n/a |
| Transcript utterances | 24 mesi | 1m / 6m / 12m / 24m / forever | sì, conversione embedding only |
| Biometric raw samples | 90 giorni | toggle | aggregati settimanali persistiti |
| Embeddings (KB) | forever | opt-out | sempre anonimi |
| Audio raw | 0 secondi | n/a | n/a |

## 8. Vendor & Sub-processors

| Vendor | Dato condiviso | DPA firmato | Region |
|---|---|---|---|
| Anthropic (Claude API) | transcript live | sì, EU SCC | EU/US |
| Deepgram | audio chunks live | sì | EU PoP available |
| ElevenLabs | testo per TTS | sì | EU/US |
| Supabase | tutto il DB | sì, EU region | EU |
| Railway | runtime backend | sì | EU |
| RevenueCat | identifiers, subscription | sì | US (SCC) |
| PostHog | event analytics | self-hosted EU | EU |

Pubblicare la lista sul sito web in `/privacy/sub-processors`.

## 9. Incident Response Plan

- T+0h: rilevamento (alert PagerDuty / DataDog su anomaly)
- T+1h: triage severity (S1-S4)
- T+4h: containment (rotate keys, restrict access)
- T+24h: notifica Authority se >100 utenti EU coinvolti
- T+72h: notifica utenti coinvolti
- T+7d: post-mortem pubblico se appropriato

Tabella `security_incidents` per traccia interna.

## 10. The Long Bet

A 36 mesi, se la Knowledge Base contiene 5M+ sessioni di trance complete, AI-Mind
non è più un'app — è il **più grande dataset scientifico** sul subconscio umano.
Quell'asset è acquisibile, brevettabile, e citato accademicamente. È il vero
business sotto il prodotto.
