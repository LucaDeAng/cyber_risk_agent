"""ElevenLabs streaming TTS wrapper."""

from __future__ import annotations

from collections.abc import AsyncIterator

from elevenlabs.client import AsyncElevenLabs

from app.config import get_settings


class TTSStreamer:
    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)
        self._voice_id = settings.elevenlabs_voice_id
        self._model = settings.elevenlabs_model

    async def stream(self, text_chunks: AsyncIterator[str]) -> AsyncIterator[bytes]:
        """Pipe Claude text chunks into ElevenLabs and yield audio bytes (Opus)."""

        async def _aggregate_to_sentence() -> AsyncIterator[str]:
            buffer = ""
            async for piece in text_chunks:
                buffer += piece
                while True:
                    boundary = self._find_sentence_boundary(buffer)
                    if boundary == -1:
                        break
                    yield buffer[: boundary + 1].strip()
                    buffer = buffer[boundary + 1 :]
            if buffer.strip():
                yield buffer.strip()

        async for sentence in _aggregate_to_sentence():
            audio_stream = self._client.text_to_speech.convert_as_stream(
                voice_id=self._voice_id,
                model_id=self._model,
                text=sentence,
                output_format="opus_48000_64",
            )
            async for chunk in audio_stream:
                yield chunk

    @staticmethod
    def _find_sentence_boundary(text: str) -> int:
        for i, ch in enumerate(text):
            if ch in ".!?…" and i > 30:
                return i
        return -1
