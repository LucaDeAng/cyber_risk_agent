import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '../../constants/theme';

export default function Welcome() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl * 1.5,
        paddingBottom: spacing.xl,
      }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={[typography.display, { color: palette.text, marginBottom: spacing.md }]}>
          AI-Mind
        </Text>
        <Text style={[typography.body, { color: palette.textDim }]}>
          Sessioni di ipnosi guidate dall'intelligenza artificiale.{'\n'}
          Adattive al tuo battito. Personalizzate sulla tua voce.{'\n'}
          Progettate per ricostruire la quiete che il lavoro ti ha tolto.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/(auth)/sign-in')}
        style={({ pressed }) => ({
          backgroundColor: pressed ? palette.accentDeep : palette.accent,
          borderRadius: radius.pill,
          paddingVertical: spacing.md,
          alignItems: 'center',
          marginBottom: spacing.sm,
        })}>
        <Text style={{ color: palette.bg, fontSize: 17, fontWeight: '600' }}>Inizia</Text>
      </Pressable>
      <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
        AI-Mind non è un dispositivo medico né sostituisce la terapia.
      </Text>
    </View>
  );
}
