# Contributing — AI-Mind

> Per ora il team è ristretto. Questo documento serve a chi (futuro hire, founder
> tecnico, o Claude Code in modalità autonoma) deve mettere mano al codice senza
> avere il contesto in testa.

## 1. Setup locale

Vedi [`README.md`](README.md) sezione 4.

## 2. Branching

- `main` → produzione (App Store release)
- `staging` → TestFlight / Play internal
- `claude/*` → branch di lavoro Claude Code on the Web
- `feat/<topic>` → feature umane
- `fix/<topic>` → bugfix
- `chore/<topic>` → infra, deps, ci

Squash-merge always. Conventional Commits per il titolo del PR.

## 3. Skills Claude Code raccomandate

| Quando | Skill | Perché |
|---|---|---|
| Modifiche al motore conversazionale | `/claude-api` | Garantisce prompt caching + best practice Anthropic SDK |
| Prima di chiudere un PR | `/code-review` | Catch correctness issues |
| Prima di un release | `/security-review` | Audit PII handling, secrets, GDPR |
| UI / mobile changes | `/verify` + `/run` | Lancia Expo e prova manualmente |
| Setup CI / hooks | `/update-config` + `/session-start-hook` | Per garantire che le sessioni cloud abbiano lint/test pronti |

## 4. Definition of Done

- [ ] Tests passano (`pytest` + `tsc --noEmit`)
- [ ] Lint clean (`ruff check` + `npx eslint .`)
- [ ] Niente segreti committati (gitleaks o `/security-review`)
- [ ] Se tocca prompt: aggiornato `backend/app/prompts/system_hypnotic.md` con commento sul perché del cambiamento
- [ ] Se tocca schema: nuova migration in `supabase/migrations/000N_*.sql`
- [ ] Se tocca privacy: aggiornato `docs/DATA_STRATEGY.md`

## 5. AI-as-coworker workflow

Quando deleghi a Claude Code:

1. **Issue first** — descrivi outcome, non implementazione
2. **Branch dedicata** — `claude/<short-slug>`
3. **Verify** prima del merge — `/verify` non è opzionale per UI changes
4. **PR review umano** — anche se i test passano

## 6. Domande aperte (lasciate qui per visibilità)

- Voce TTS personalizzata: clonazione vocale ElevenLabs per "il tuo coach"? Implicazioni etiche?
- BPM da Apple Watch in background quando l'app non è in foreground: richiede Background Tasks entitlement.
- Modello pricing: lifetime €499 abbastanza alto? Test su cohort early adopter.
