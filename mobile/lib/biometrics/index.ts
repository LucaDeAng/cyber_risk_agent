/**
 * Biometric source factory.
 *
 * Selection order (auto):
 *   1. Polar H10 (BLE) — most accurate, lowest latency
 *   2. HealthKit       — iOS native, polled at 1.5 Hz
 *   3. Mock            — always available, used in Expo Go / offline
 *
 * To override from settings, pass a preferred kind.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthKitBpmSource } from './healthkit';
import { MockBpmSource } from './mock';
import { PolarBpmSource } from './polar';
import type { BpmSource, BpmSourceKind } from './types';

export type { BpmListener, BpmSource, BpmSourceKind } from './types';
export { MockBpmSource } from './mock';

const PREF_KEY = 'aimind.bpm_source_pref';

async function getPreferred(): Promise<BpmSourceKind | null> {
  const v = await AsyncStorage.getItem(PREF_KEY);
  return (v as BpmSourceKind | null) ?? null;
}

export async function setPreferredBpmSource(kind: BpmSourceKind | null): Promise<void> {
  if (kind == null) await AsyncStorage.removeItem(PREF_KEY);
  else await AsyncStorage.setItem(PREF_KEY, kind);
}

export async function createBpmSource(): Promise<BpmSource> {
  const preferred = await getPreferred();
  const candidates: BpmSource[] = [
    new PolarBpmSource(),
    new HealthKitBpmSource(),
    new MockBpmSource(),
  ];
  if (preferred) {
    const exact = candidates.find((c) => c.kind === preferred);
    if (exact && (await (exact.isAvailable?.() ?? Promise.resolve(true)))) return exact;
  }
  for (const c of candidates) {
    if (await (c.isAvailable?.() ?? Promise.resolve(true))) return c;
  }
  return new MockBpmSource();
}
