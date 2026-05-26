"""Guardrails for the hypnotic system prompt.

The prompt is a product asset. If a contributor edits it accidentally and
removes a safety section, CI catches it here. These tests are deliberately
loose on phrasing but strict on the presence of the critical building blocks.
"""

from pathlib import Path

PROMPT_PATH = Path(__file__).resolve().parents[1] / "app" / "prompts" / "system_hypnotic.md"


def _prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def test_prompt_file_exists_and_non_trivial():
    text = _prompt()
    assert len(text) > 4000, f"prompt suspiciously short ({len(text)} chars)"


def test_crisis_token_is_documented_and_explicit():
    text = _prompt()
    assert "<<<CRISIS_HANDOFF>>>" in text
    # The safety section must come BEFORE the input contract
    safety_idx = text.find("# 0. SAFETY")
    contract_idx = text.find("# 1. INPUT CONTRACT")
    assert 0 <= safety_idx < contract_idx


def test_three_protocols_all_present():
    text = _prompt().lower()
    for goal in ("layoff_resilience", "sleep", "focus_recovery"):
        assert goal in text, f"missing goal: {goal}"


def test_all_five_phases_have_sections():
    text = _prompt().lower()
    for phase in ("induction", "deepening", "suggestion", "integration", "awakening"):
        assert phase in text, f"missing phase: {phase}"


def test_personalisation_rule_present():
    text = _prompt()
    assert "last_user_utterance" in text
    assert "verbatim" in text.lower()


def test_anti_patterns_listed():
    text = _prompt().lower()
    # If someone removes the "don't break character" rule the model wanders.
    assert "anti-pattern" in text or "never do these" in text


def test_style_contract_mentions_pause_tags():
    text = _prompt()
    assert "<pause:" in text


def test_output_contract_forbids_json():
    text = _prompt()
    # The model must return spoken text only — confirm the rule is in place
    assert "No JSON" in text or "ONLY the text to be spoken" in text
