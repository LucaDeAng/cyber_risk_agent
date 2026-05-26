/**
 * Polar H10 / OH1 BPM source over Bluetooth LE.
 *
 * Uses the standard Heart Rate Service GATT profile:
 *   service:        0x180D
 *   characteristic: 0x2A37 (Heart Rate Measurement)
 *
 * The first byte of each notification is a flags byte; if bit 0 is 0 the BPM
 * is in the next byte, if 1 it's the next two bytes (uint16 LE). See
 * https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
 *
 * Loads `react-native-ble-plx` dynamically (custom Expo dev client required).
 */

import type { BpmListener, BpmSource } from './types';

const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_CHAR = '00002a37-0000-1000-8000-00805f9b34fb';

type Subscription = { remove: () => void };

type BleManager = {
  startDeviceScan: (
    services: string[] | null,
    options: unknown,
    cb: (error: unknown, device: { id: string; name?: string } | null) => void,
  ) => void;
  stopDeviceScan: () => void;
  connectToDevice: (id: string) => Promise<unknown>;
  discoverAllServicesAndCharacteristicsForDevice: (id: string) => Promise<unknown>;
  monitorCharacteristicForDevice: (
    id: string,
    service: string,
    characteristic: string,
    cb: (err: unknown, char: { value?: string | null } | null) => void,
  ) => Subscription;
  cancelDeviceConnection: (id: string) => Promise<unknown>;
};

function tryLoad(): { BleManager: new () => BleManager } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-ble-plx');
  } catch {
    return null;
  }
}

function decodeBpm(b64: string): number {
  // Buffer is not always available in Expo; decode base64 → bytes manually.
  const bin = globalThis.atob ? globalThis.atob(b64) : '';
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (bytes.length < 2) return 0;
  const flags = bytes[0];
  return (flags & 0x01) === 0 ? bytes[1] : bytes[1] | (bytes[2] << 8);
}

export class PolarBpmSource implements BpmSource {
  readonly kind = 'polar_h10' as const;
  readonly label = 'Polar H10 (BLE)';

  private manager: BleManager | null = null;
  private subscription: Subscription | null = null;
  private deviceId: string | null = null;

  async isAvailable() {
    return !!tryLoad();
  }

  async start(listener: BpmListener) {
    const lib = tryLoad();
    if (!lib) throw new Error('react-native-ble-plx not installed');
    this.manager = new lib.BleManager();

    const device = await this.scanForFirst();
    if (!device) throw new Error('Polar H10 non trovato. Indossa la fascia e riprova.');
    this.deviceId = device.id;

    await this.manager!.connectToDevice(device.id);
    await this.manager!.discoverAllServicesAndCharacteristicsForDevice(device.id);

    this.subscription = this.manager!.monitorCharacteristicForDevice(
      device.id,
      HR_SERVICE,
      HR_CHAR,
      (err, char) => {
        if (err || !char?.value) return;
        const bpm = decodeBpm(char.value);
        if (bpm > 30 && bpm < 220) listener(bpm, Date.now());
      },
    );
  }

  private async scanForFirst(): Promise<{ id: string } | null> {
    if (!this.manager) return null;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.manager!.stopDeviceScan();
        resolve(null);
      }, 8000);
      this.manager!.startDeviceScan([HR_SERVICE], null, (err, device) => {
        if (err || !device) return;
        if (device.name && /Polar/i.test(device.name)) {
          clearTimeout(timeout);
          this.manager!.stopDeviceScan();
          resolve(device);
        }
      });
    });
  }

  stop() {
    this.subscription?.remove();
    this.subscription = null;
    if (this.manager && this.deviceId) {
      this.manager.cancelDeviceConnection(this.deviceId).catch(() => {});
    }
    this.deviceId = null;
    this.manager = null;
  }
}
