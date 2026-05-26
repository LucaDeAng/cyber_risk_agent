import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '../constants/theme';
import {
  createBpmSource,
  setPreferredBpmSource,
  type BpmSource,
  type BpmSourceKind,
} from '../lib/biometrics';
import { HealthKitBpmSource } from '../lib/biometrics/healthkit';
import { MockBpmSource } from '../lib/biometrics/mock';
import { PolarBpmSource } from '../lib/biometrics/polar';

type Row = { kind: BpmSourceKind; label: string; available: boolean; note: string };

export default function BpmSourcePicker() {
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState<BpmSourceKind | null>(null);
  const [previewBpm, setPreviewBpm] = useState<number>(0);

  useEffect(() => {
    const sources: BpmSource[] = [
      new PolarBpmSource(),
      new HealthKitBpmSource(),
      new MockBpmSource(),
    ];
    Promise.all(
      sources.map(async (s) => ({
        kind: s.kind,
        label: s.label,
        available: await (s.isAvailable?.() ?? Promise.resolve(true)),
        note:
          s.kind === 'polar_h10'
            ? 'Richiede fascia accesa e dev client custom (react-native-ble-plx).'
            : s.kind === 'healthkit'
              ? 'Solo iOS, polling 1.5 Hz. Richiede dev client (react-native-health).'
              : 'Sempre disponibile. Battito simulato per dev e demo.',
      })),
    ).then(setRows);

    createBpmSource().then((src) => {
      setActive(src.kind);
      src.start((v) => setPreviewBpm(v)).catch(() => {});
      return () => src.stop();
    });
  }, []);

  async function choose(kind: BpmSourceKind) {
    await setPreferredBpmSource(kind);
    setActive(kind);
    Alert.alert(
      'Sorgente aggiornata',
      'Verrà usata nella prossima sessione. Ottimo lavoro.',
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Sorgente BPM' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[typography.title, { color: palette.text, marginBottom: spacing.sm }]}>
          Sorgente del battito
        </Text>
        <Text style={[typography.caption, { marginBottom: spacing.lg }]}>
          AI-Mind sceglie la sorgente migliore automaticamente. Puoi forzarne una qui sotto.
        </Text>

        <View
          style={{
            backgroundColor: palette.bgRaised,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            alignItems: 'center',
          }}>
          <Text style={[typography.caption]}>Anteprima live</Text>
          <Text style={{ color: palette.text, fontSize: 56, fontWeight: '300' }}>
            {previewBpm || '—'}
          </Text>
          <Text style={[typography.caption]}>BPM</Text>
        </View>

        {rows.map((r) => (
          <Pressable
            key={r.kind}
            disabled={!r.available}
            onPress={() => choose(r.kind)}
            style={({ pressed }) => ({
              backgroundColor:
                active === r.kind
                  ? palette.bgElevated
                  : pressed
                    ? palette.bgElevated
                    : palette.bgRaised,
              borderRadius: radius.md,
              padding: spacing.lg,
              marginBottom: spacing.sm,
              borderColor: active === r.kind ? palette.accent : 'transparent',
              borderWidth: 1,
              opacity: r.available ? 1 : 0.45,
            })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.text, fontSize: 17, fontWeight: '500' }}>
                {r.label}
              </Text>
              {active === r.kind && (
                <Text style={{ color: palette.accent, fontWeight: '600' }}>attiva</Text>
              )}
            </View>
            <Text style={[typography.caption, { marginTop: spacing.xs }]}>{r.note}</Text>
            {!r.available && (
              <Text style={[typography.caption, { marginTop: spacing.xs, color: palette.warning }]}>
                Non disponibile in questo build.
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
