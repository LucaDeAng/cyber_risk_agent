import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BpmRing } from '../../components/BpmRing';
import { palette, radius, spacing, typography } from '../../constants/theme';
import { createBpmSource, type BpmSource } from '../../lib/biometrics';
import type { Goal } from '../../lib/api';

type Protocol = {
  goal: Goal;
  title: string;
  subtitle: string;
  duration: number;
};

const PROTOCOLS: Protocol[] = [
  {
    goal: 'layoff_resilience',
    title: 'Layoff Resilience',
    subtitle: 'Incontra il tuo te del futuro. 28 min.',
    duration: 28,
  },
  {
    goal: 'sleep',
    title: 'Sonno profondo',
    subtitle: 'Trance dolce verso il sonno. 24 min.',
    duration: 24,
  },
  {
    goal: 'focus_recovery',
    title: 'Recupero focus',
    subtitle: 'Disconnetti, ricarica, riemergi. 18 min.',
    duration: 18,
  },
];

export default function Home() {
  const [bpm, setBpm] = useState<number>(0);

  useEffect(() => {
    let source: BpmSource | null = null;
    let cancelled = false;
    createBpmSource().then(async (s) => {
      if (cancelled) return;
      source = s;
      try {
        await s.start((value) => setBpm(value));
      } catch {
        // Fail silently on the home preview — session screen handles fallback.
      }
    });
    return () => {
      cancelled = true;
      source?.stop();
    };
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
      }}>
      <Text style={[typography.caption, { marginBottom: spacing.xs }]}>Buonasera</Text>
      <Text style={[typography.display, { color: palette.text, marginBottom: spacing.lg }]}>
        Pronto?
      </Text>

      <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
        <BpmRing bpm={bpm} />
      </View>

      <Text style={[typography.title, { color: palette.text, marginBottom: spacing.md }]}>
        Scegli un protocollo
      </Text>

      {PROTOCOLS.map((p) => (
        <Pressable
          key={p.goal}
          onPress={() => router.push({ pathname: '/session/[goal]', params: { goal: p.goal } })}
          style={({ pressed }) => ({
            backgroundColor: pressed ? palette.bgElevated : palette.bgRaised,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
          })}>
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '500' }}>{p.title}</Text>
          <Text style={[typography.caption, { marginTop: spacing.xs }]}>{p.subtitle}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
