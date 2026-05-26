/**
 * Streaming audio player for TTS chunks delivered via WebSocket.
 *
 * Strategy:
 * - We receive Opus chunks (base64) over WS.
 * - We append them to an in-memory queue and play with expo-av Audio.Sound.
 * - For MVP we play one chunk at a time; Phase 1 switches to a true
 *   gapless ring buffer using react-native-track-player.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export class TtsChunkPlayer {
  private queue: string[] = [];
  private playing = false;
  private tmpDir: string;

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

  async enqueueB64(b64: string) {
    this.queue.push(b64);
    if (!this.playing) {
      await this.drain();
    }
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
  }
}
