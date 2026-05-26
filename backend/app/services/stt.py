"""Deepgram Nova-2 streaming STT.

Used during phases where the user is invited to speak (e.g. layoff_resilience
suggestion phase, where the future self description becomes part of the
adaptive imagery).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents

from app.config import get_settings


class STTStreamer:
    def __init__(self) -> None:
        settings = get_settings()
        self._client = DeepgramClient(settings.deepgram_api_key)

    async def transcribe(
        self,
        audio_chunks: AsyncIterator[bytes],
        language: str = "it",
    ) -> AsyncIterator[tuple[str, bool]]:
        """Yield (text, is_final) tuples as Deepgram emits them."""
        connection = self._client.listen.asynclive.v("1")

        finals: list[str] = []
        latest_partial = ""

        async def on_transcript(_self, result, **_kwargs):
            nonlocal latest_partial
            transcript = result.channel.alternatives[0].transcript
            if not transcript:
                return
            if result.is_final:
                finals.append(transcript)
                latest_partial = ""
            else:
                latest_partial = transcript

        connection.on(LiveTranscriptionEvents.Transcript, on_transcript)

        options = LiveOptions(
            model="nova-2",
            language=language,
            smart_format=True,
            encoding="opus",
            sample_rate=16000,
            interim_results=True,
        )
        await connection.start(options)

        try:
            async for chunk in audio_chunks:
                await connection.send(chunk)
                if finals:
                    yield finals.pop(0), True
                elif latest_partial:
                    yield latest_partial, False
        finally:
            await connection.finish()
