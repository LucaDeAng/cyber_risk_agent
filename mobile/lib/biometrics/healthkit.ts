/**
 * HealthKit BPM source (iOS only).
 *
 * Uses `react-native-health` if the user has added it to the project and built
 * a custom Expo dev client. The library is loaded dynamically so the MVP keeps
 * running in Expo Go (which lacks native HealthKit bindings).
 *
 * Install (when ready):
 *   npx expo install react-native-health
 *   npx expo prebuild --clean
 *
 * Then re-run with a dev client (`eas build --profile development --platform ios`).
 */

import { Platform } from 'react-native';
import type { BpmListener, BpmSource } from './types';

const PERMS = {
  permissions: {
    read: ['HeartRate', 'HeartRateVariabilitySDNN'],
    write: [] as string[],
  },
};

type RNHealth = {
  initHealthKit: (perms: unknown, cb: (err: string | null) => void) => void;
  getHeartRateSamples: (
    opts: { startDate: string; ascending: boolean; limit: number },
    cb: (err: string | null, results: Array<{ value: number; startDate: string }>) => void,
  ) => void;
  Constants?: unknown;
};

function tryLoad(): RNHealth | null {
  try {
    // Dynamic require so Metro doesn't fail in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-health');
    return (mod.default ?? mod) as RNHealth;
  } catch {
    return null;
  }
}

export class HealthKitBpmSource implements BpmSource {
  readonly kind = 'healthkit' as const;
  readonly label = 'Apple Health (iOS)';

  private poll: ReturnType<typeof setInterval> | null = null;
  private rnHealth: RNHealth | null = null;

  async isAvailable() {
    if (Platform.OS !== 'ios') return false;
    return !!tryLoad();
  }

  async start(listener: BpmListener) {
    if (Platform.OS !== 'ios') throw new Error('HealthKit available only on iOS');
    this.rnHealth = tryLoad();
    if (!this.rnHealth) throw new Error('react-native-health not installed');

    await new Promise<void>((resolve, reject) => {
      this.rnHealth!.initHealthKit(PERMS, (err) => (err ? reject(new Error(err)) : resolve()));
    });

    // HealthKit doesn't push live BPM; we poll the latest sample once per second.
    const fetchLatest = () => {
      const startDate = new Date(Date.now() - 60 * 1000).toISOString();
      this.rnHealth!.getHeartRateSamples(
        { startDate, ascending: false, limit: 1 },
        (err, results) => {
          if (err || !results.length) return;
          const sample = results[0];
          const tsMs = new Date(sample.startDate).getTime();
          listener(Math.round(sample.value), tsMs);
        },
      );
    };
    fetchLatest();
    this.poll = setInterval(fetchLatest, 1500);
  }

  stop() {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
  }
}
