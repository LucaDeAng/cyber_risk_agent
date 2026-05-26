import { ScrollView, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '../../constants/theme';

export default function Insights() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
      <Text style={[typography.display, { color: palette.text, marginBottom: spacing.lg }]}>
        Insights
      </Text>

      <View
        style={{
          backgroundColor: palette.bgRaised,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
        }}>
        <Text style={[typography.caption]}>I tuoi temi ricorrenti</Text>
        <Text style={[typography.title, { color: palette.text, marginTop: spacing.sm }]}>
          Insight personali in arrivo
        </Text>
        <Text style={[typography.body, { color: palette.textDim, marginTop: spacing.sm }]}>
          Quando avrai completato 5 sessioni, AI-Mind inizierà a mappare i temi che emergono nel
          tuo subconscio e mostrerà qui le costellazioni più frequenti.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: palette.bgRaised,
          borderRadius: radius.lg,
          padding: spacing.lg,
        }}>
        <Text style={[typography.caption]}>Traiettoria della resilienza</Text>
        <Text style={[typography.title, { color: palette.text, marginTop: spacing.sm }]}>
          —
        </Text>
        <Text style={[typography.body, { color: palette.textDim, marginTop: spacing.sm }]}>
          Profondità della trance, recupero post-sessione e qualità del sonno verranno tracciati
          settimanalmente.
        </Text>
      </View>
    </ScrollView>
  );
}
