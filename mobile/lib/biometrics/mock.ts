import type { BpmListener, BpmSource } from './types';

/**
 * Plausible BPM walker. Drifts down with mild noise (mirrors what we expect
 * during induction). Used in offline mode and dev to exercise the WS protocol.
 */
export class MockBpmSource implements BpmSource {
  readonly kind = 'mock' as const;
  readonly label = 'Mock BPM (modalità dev)';

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

  async isAvailable() {
    return true;
  }
}
