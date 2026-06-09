"""Scripted hypnosis content used as offline fallback.

Used when ANTHROPIC_API_KEY is not configured. The text below is intentionally
generic but follows the same phase contract as the live Claude engine: pause
markers (`<pause:Nms>`), short sentences, second-person present continuous.

A future Phase 1 improvement: a clinical advisor (hypnotist) refines these
scripts and we treat them as canonical "v0" content for the closed alpha.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.services.types import BpmTrend, Goal, Phase

PHASE_SCRIPTS: dict[tuple[Goal, Phase], list[str]] = {
    # ── Layoff Resilience ──────────────────────────────────────────────────
    ("layoff_resilience", "induction"): [
        "Trovati una posizione comoda.<pause:800ms> Lascia che le spalle si abbassino, "
        "lentamente.<pause:600ms> Senti il peso del corpo che si appoggia.<pause:1000ms>",
        "Ora porta l'attenzione al respiro.<pause:500ms> Non cambiarlo.<pause:400ms> "
        "Solo notalo.<pause:1200ms> L'aria che entra.<pause:800ms> L'aria che esce.<pause:1200ms>",
        "Con ogni espirazione, qualcosa si scioglie.<pause:600ms> Le notizie, le email, "
        "i pensieri sul lavoro che è cambiato.<pause:1000ms> Lascia che si sfochino.<pause:1500ms>",
    ],
    ("layoff_resilience", "deepening"): [
        "Stai scendendo.<pause:800ms> Più in profondità.<pause:600ms> Come se ogni respiro "
        "ti portasse un gradino più giù, in uno spazio sicuro.<pause:1200ms>",
        "Immagina davanti a te una scala dolce.<pause:600ms> Dieci gradini di legno chiaro, "
        "tiepidi.<pause:800ms> Scendi.<pause:400ms> Dieci.<pause:800ms> Nove.<pause:800ms> "
        "Sempre più rilassato.<pause:1000ms>",
        "Otto.<pause:800ms> Sette.<pause:800ms> Il corpo è pesante.<pause:600ms> "
        "Sei.<pause:800ms> Cinque.<pause:800ms> La mente è quieta.<pause:1500ms>",
    ],
    ("layoff_resilience", "suggestion"): [
        "Ora, davanti a te, c'è una porta.<pause:800ms> Oltre quella porta c'è il tuo te del "
        "futuro, a diciotto mesi da oggi.<pause:1200ms> Calmo.<pause:400ms> "
        "Impiegato in qualcosa che ha senso.<pause:800ms> Hai attraversato.<pause:1500ms>",
        "Apri la porta.<pause:1000ms> Guarda il volto di chi ti accoglie.<pause:1000ms> "
        "Nota come si muove, come respira, dove vive.<pause:1500ms> "
        "Quello sei tu.<pause:1200ms>",
        "Lascia che ti dica una cosa.<pause:1000ms> Una frase che avresti voluto sentirti "
        "dire adesso.<pause:1500ms> Ascolta.<pause:2000ms> "
        "Quella frase rimane con te.<pause:1000ms>",
    ],
    ("layoff_resilience", "integration"): [
        "Quel te del futuro ti consegna qualcosa.<pause:800ms> Un piccolo oggetto, un colore, "
        "un'immagine.<pause:1000ms> Prendilo.<pause:600ms> È tuo.<pause:1200ms>",
        "Saluta.<pause:800ms> Sai che potrai tornare.<pause:600ms> Riattraversa la porta, "
        "porta con te quello che hai ricevuto.<pause:1500ms>",
    ],
    ("layoff_resilience", "awakening"): [
        "Pian piano, riporta l'attenzione al corpo.<pause:800ms> Senti i piedi.<pause:600ms> "
        "Senti le mani.<pause:800ms>",
        "Quando sei pronto, fai un respiro profondo.<pause:1000ms> Apri gli occhi.<pause:600ms> "
        "Sei qui.<pause:800ms> E qualcosa, dentro, è cambiato.<pause:1000ms>",
    ],
    # ── Sleep ──────────────────────────────────────────────────────────────
    ("sleep", "induction"): [
        "Sdraiati comodamente.<pause:800ms> Lascia che il materasso ti sostenga "
        "completamente.<pause:1000ms> Non devi fare nulla.<pause:1200ms>",
        "Il respiro rallenta da solo.<pause:800ms> Non cercarlo, accadrà.<pause:1500ms> "
        "Inspiro.<pause:1000ms> Espiro.<pause:1500ms>",
    ],
    ("sleep", "deepening"): [
        "Senti il corpo diventare pesante.<pause:800ms> Le palpebre, pesanti.<pause:800ms> "
        "Le braccia, pesanti.<pause:1000ms> Le gambe affondano dolcemente.<pause:1500ms>",
        "Una luce calda, morbida, ti avvolge.<pause:1000ms> Come acqua tiepida.<pause:800ms> "
        "Più affondi, più diventi quieto.<pause:1500ms>",
    ],
    ("sleep", "suggestion"): [
        "Ora ti trovi in una foresta al tramonto.<pause:800ms> Le foglie si muovono "
        "appena.<pause:1000ms> Senti il profumo del sottobosco.<pause:1200ms>",
        "C'è un piccolo letto di muschio, preparato per te.<pause:1000ms> Ti sdrai. "
        "<pause:800ms> Il muschio è morbido, asciutto, perfetto.<pause:1500ms>",
        "Sopra di te, le stelle iniziano ad accendersi.<pause:1000ms> Una dopo "
        "l'altra.<pause:800ms> Le conti.<pause:600ms> Una. Due. Tre.<pause:2000ms> "
        "Smetti di contare.<pause:1500ms>",
    ],
    ("sleep", "integration"): [
        "Il sonno arriva da sé.<pause:1500ms> Non c'è nulla da fare.<pause:1000ms> "
        "Nulla da trattenere.<pause:1500ms>",
    ],
    ("sleep", "awakening"): [
        "Lascia che il sonno ti prenda.<pause:2000ms> Buonanotte.<pause:3000ms>",
    ],
    # ── Focus Recovery ─────────────────────────────────────────────────────
    ("focus_recovery", "induction"): [
        "Siediti dritto, ma rilassato.<pause:800ms> I piedi a terra.<pause:600ms> "
        "Le mani che riposano.<pause:1000ms>",
        "Tre respiri lunghi.<pause:600ms> Il primo per arrivare.<pause:1500ms> "
        "Il secondo per lasciar andare.<pause:1500ms> Il terzo per scegliere di essere "
        "qui.<pause:1500ms>",
    ],
    ("focus_recovery", "deepening"): [
        "Davanti a te c'è un lago.<pause:800ms> L'acqua è ferma.<pause:1000ms> "
        "La superficie riflette il cielo.<pause:1200ms>",
        "Ogni pensiero che arriva è una piccola onda.<pause:800ms> "
        "La noti, poi l'acqua torna ferma.<pause:1500ms>",
    ],
    ("focus_recovery", "suggestion"): [
        "Ora, da qualche parte sopra l'acqua, c'è una sola intenzione per le prossime "
        "ore.<pause:1000ms> Una cosa che davvero conta.<pause:1500ms>",
        "Lascia che emerga.<pause:1000ms> Non forzarla.<pause:800ms> "
        "Quando arriva, ha una forma chiara.<pause:1500ms>",
        "Prendila con te.<pause:800ms> Mettila dentro, vicino al respiro.<pause:1500ms>",
    ],
    ("focus_recovery", "integration"): [
        "L'acqua torna ferma.<pause:1000ms> Sai cosa fare dopo.<pause:800ms> "
        "Lo sai con chiarezza.<pause:1500ms>",
    ],
    ("focus_recovery", "awakening"): [
        "Respira profondamente.<pause:800ms> Riporta l'attenzione al corpo.<pause:600ms> "
        "Apri gli occhi quando sei pronto.<pause:1000ms> "
        "Sei lucido.<pause:600ms> Sei qui.<pause:800ms>",
    ],
}


class ScriptedHypnosisEngine:
    """Offline fallback engine. Deterministic per-phase content."""

    def __init__(self) -> None:
        self._turn_counts: dict[tuple[Goal, Phase], int] = {}

    def reset(self) -> None:
        self._turn_counts.clear()

    async def stream_turn(
        self,
        *,
        phase: Phase,
        goal: Goal,
        bpm_trend: BpmTrend,  # noqa: ARG002
        elapsed_min: float,  # noqa: ARG002
        last_user_utterance: str,  # noqa: ARG002
    ) -> AsyncIterator[str]:
        key = (goal, phase)
        scripts = PHASE_SCRIPTS.get(key, [])
        if not scripts:
            yield "<pause:2000ms>"
            return
        idx = self._turn_counts.get(key, 0) % len(scripts)
        self._turn_counts[key] = idx + 1
        text = scripts[idx]
        # Yield word-by-word so callers can pipe to TTS or captions identically
        for word in text.split(" "):
            yield word + " "

    @staticmethod
    def estimate_phase_duration_sec(phase: Phase) -> float:
        return {
            "induction": 240.0,
            "deepening": 360.0,
            "suggestion": 900.0,
            "integration": 240.0,
            "awakening": 90.0,
        }[phase]
