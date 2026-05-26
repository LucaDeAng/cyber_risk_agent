"""Tests for the adaptive narrative state machine.

These tests cover only the deterministic state-machine logic — Claude/ElevenLabs
calls are out of scope and tested via integration suite (TBD).
"""

from time import monotonic

from app.services.adaptive_narrative import BiometricWindow, SessionState


def test_biometric_trend_unknown_when_few_samples():
    w = BiometricWindow()
    w.push(80)
    w.push(78)
    assert w.trend() == "unknown"


def test_biometric_trend_falling():
    w = BiometricWindow()
    for bpm in [90, 89, 88, 86, 84, 82, 80, 78, 76, 74]:
        w.push(bpm)
    assert w.trend() == "falling"


def test_biometric_trend_rising():
    w = BiometricWindow()
    for bpm in [70, 72, 74, 76, 78, 82, 84, 86, 88, 90]:
        w.push(bpm)
    assert w.trend() == "rising"


def test_phase_advances_after_time_and_falling_bpm():
    state = SessionState(goal="layoff_resilience")
    state.phase_started_at = monotonic() - 200.0
    for bpm in [90, 88, 86, 84, 82, 80, 78, 76, 74, 72]:
        state.biometrics.push(bpm)
    advanced = state.maybe_advance_phase()
    assert advanced
    assert state.phase == "deepening"


def test_phase_holds_when_bpm_rising():
    state = SessionState(goal="layoff_resilience")
    state.phase_started_at = monotonic() - 200.0
    for bpm in [70, 72, 74, 76, 78, 82, 84, 86, 88, 90]:
        state.biometrics.push(bpm)
    advanced = state.maybe_advance_phase()
    assert not advanced
    assert state.phase == "induction"
