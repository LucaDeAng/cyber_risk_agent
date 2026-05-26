/**
 * Biometric sources.
 *
 * Phase 0 (this MVP): mock BPM that walks a plausible curve. This lets us
 * exercise the entire WS protocol and adaptive narrative without depending
 * on a paired device.
 *
 * Phase 1: replace `MockBpmSource` with `HealthKitBpmSource` (iOS via
 * react-native-health) and `PolarBpmSource` (BLE via react-native-ble-plx).
 */

export type BpmListener = (bpm: number, tsMs: number) => void;

export interface BpmSource {
  start(listener: BpmListener): void;
  stop(): void;
}

export class MockBpmSource implements BpmSource {
  private interval: ReturnType<typeof setInterval> | null = null;
  private bpm = 78;
  private trendDownProbability = 0.7;

  start(listener: BpmListener) {
    this.interval = setInterval(() => {
      const drift = Math.random() < this.trendDownProbability ? -1 : 1;
      const noise = Math.floor(Math.random() * 3) - 1;
      this.bpm = Math.max(54, Math.min(110, this.bpm + drift + noise));
      listener(this.bpm, Date.now());
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
