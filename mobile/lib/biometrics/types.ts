export type BpmListener = (bpm: number, tsMs: number) => void;

export type BpmSourceKind = 'healthkit' | 'polar_h10' | 'apple_watch_ble' | 'mock';

export interface BpmSource {
  readonly kind: BpmSourceKind;
  readonly label: string;
  start(listener: BpmListener): Promise<void> | void;
  stop(): void;
  /** Optional liveness probe. Returns true if the source is ready to stream. */
  isAvailable?(): Promise<boolean>;
}
