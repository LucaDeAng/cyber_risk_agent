"""Shared type aliases for the session services.

Kept in its own module so unit tests of the state machine don't need to pull in
heavy dependencies (anthropic, elevenlabs, deepgram) transitively.
"""

from typing import Literal

Phase = Literal["induction", "deepening", "suggestion", "integration", "awakening"]
Goal = Literal["sleep", "focus_recovery", "layoff_resilience"]
BpmTrend = Literal["falling", "stable", "rising", "unknown"]
