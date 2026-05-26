import { Text, View } from 'react-native';
import { palette, radius, spacing } from '../constants/theme';

export type Phase = 'induction' | 'deepening' | 'suggestion' | 'integration' | 'awakening';

const LABELS: Record<Phase, string> = {
  induction: 'Induzione',
  deepening: 'Approfondimento',
  suggestion: 'Suggestione',
  integration: 'Integrazione',
  awakening: 'Risveglio',
};

const ORDER: Phase[] = ['induction', 'deepening', 'suggestion', 'integration', 'awakening'];

export function PhaseIndicator({ phase }: { phase: Phase }) {
  const idx = ORDER.indexOf(phase);
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
      {ORDER.map((p, i) => (
        <View
          key={p}
          style={{
            height: 4,
            flex: 1,
            backgroundColor: i <= idx ? palette.accent : palette.bgElevated,
            borderRadius: radius.sm,
          }}
        />
      ))}
      <Text style={{ color: palette.textDim, fontSize: 12, marginLeft: spacing.sm }}>
        {LABELS[phase]}
      </Text>
    </View>
  );
}
