/**
 * Audio output with offline fallback.
 *
 * Two modes:
 * 1. **Backend TTS** (live ElevenLabs): backend streams Opus audio chunks via WS,
 *    we queue + play them with expo-av Audio.Sound.
 * 2. **Client TTS** (fallback when ELEVENLABS_API_KEY is missing): backend only
 *    sends text. We use expo-speech to narrate `turn_complete` events.
 *
 * The backend tells us which mode via `{ type: 'ready', client_tts_required: true }`.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';

export class TtsChunkPlayer {
  private queue: string[] = [];
  private playing = false;
  private tmpDir: string;
  private clientTtsMode = false;

  constructor() {
    this.tmpDir = `${FileSystem.cacheDirectory ?? ''}aimind-tts/`;
  }

  async init() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    await FileSystem.makeDirectoryAsync(this.tmpDir, { intermediates: true }).catch(() => {});
  }

  setClientTtsMode(enabled: boolean) {
    this.clientTtsMode = enabled;
  }

  async enqueueB64(b64: string) {
    if (this.clientTtsMode) return; // ignore audio chunks; client TTS will handle text
    this.queue.push(b64);
    if (!this.playing) await this.drain();
  }

  async speakClientSide(text: string, language = 'it-IT') {
    if (!this.clientTtsMode) return;
    const stripped = text
      .replace(/<pause:(\d+)ms>/g, ',')
      .replace(/<emphasis>/g, '')
      .replace(/<\/emphasis>/g, '');
    return new Promise<void>((resolve) => {
      Speech.speak(stripped, {
        language,
        rate: 0.78,
        pitch: 0.95,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }

  private async drain() {
    this.playing = true;
    try {
      while (this.queue.length > 0) {
        const b64 = this.queue.shift()!;
        const path = `${this.tmpDir}chunk-${Date.now()}.opus`;
        await FileSystem.writeAsStringAsync(path, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });
        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('didJustFinish' in status && status.didJustFinish) resolve();
          });
        });
        await sound.unloadAsync();
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } finally {
      this.playing = false;
    }
  }

  async stopAndClear() {
    this.queue = [];
    Speech.stop();
  }
}
