"""Adaptive narrative state machine.

Drives phase transitions based on biometric signals + elapsed time. The state
machine is intentionally simple (finite states, deterministic transitions); the
*content* within each phase is what the Claude engine adapts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from time import monotonic

from app.services.types import BpmTrend, Goal, Phase


@dataclass
class BiometricWindow:
    """Sliding window of BPM samples used to compute trend."""

    samples: list[tuple[float, int]] = field(default_factory=list)
    window_sec: float = 30.0

    def push(self, bpm: int) -> None:
        now = monotonic()
        self.samples.append((now, bpm))
        cutoff = now - self.window_sec
        self.samples = [s for s in self.samples if s[0] >= cutoff]

    def trend(self) -> BpmTrend:
        if len(self.samples) < 5:
            return "unknown"
        first_half = self.samples[: len(self.samples) // 2]
        second_half = self.samples[len(self.samples) // 2 :]
        avg_first = sum(b for _, b in first_half) / len(first_half)
        avg_second = sum(b for _, b in second_half) / len(second_half)
        delta = avg_second - avg_first
        if delta <= -2.0:
            return "falling"
        if delta >= 2.0:
            return "rising"
        return "stable"


_PHASE_ORDER: list[Phase] = [
    "induction",
    "deepening",
    "suggestion",
    "integration",
    "awakening",
]


@dataclass
class SessionState:
    goal: Goal
    started_at: float = field(default_factory=monotonic)
    phase: Phase = "induction"
    phase_started_at: float = field(default_factory=monotonic)
    biometrics: BiometricWindow = field(default_factory=BiometricWindow)
    last_user_utterance: str = ""

    def elapsed_min(self) -> float:
        return (monotonic() - self.started_at) / 60.0

    def phase_elapsed_sec(self) -> float:
        return monotonic() - self.phase_started_at

    def maybe_advance_phase(self) -> bool:
        """Decide if we should move to the next phase. Returns True if advanced."""
        elapsed = self.phase_elapsed_sec()
        trend = self.biometrics.trend()

        # Per-phase exit criteria. Time bounds + biometric assist.
        criteria = {
            "induction": (180.0, lambda: trend in ("falling", "stable")),
            "deepening": (240.0, lambda: trend in ("falling", "stable")),
            "suggestion": (720.0, lambda: True),
            "integration": (180.0, lambda: True),
            "awakening": (60.0, lambda: True),
        }
        min_sec, ok = criteria[self.phase]
        if elapsed >= min_sec and ok():
            idx = _PHASE_ORDER.index(self.phase)
            if idx + 1 < len(_PHASE_ORDER):
                self.phase = _PHASE_ORDER[idx + 1]
                self.phase_started_at = monotonic()
                return True
        return False

    def is_finished(self) -> bool:
        return (
            self.phase == "awakening"
            and self.phase_elapsed_sec() >= 60.0
        )
