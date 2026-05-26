import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/welcome');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
      <Text style={[typography.display, { color: palette.text, marginBottom: spacing.lg }]}>
        Profilo
      </Text>

      {(['Dispositivo cardio', 'Voce preferita', 'Privacy', 'Lingua', 'Notifiche'] as const).map(
        (label) => (
          <Pressable
            key={label}
            onPress={() => Alert.alert(label, 'Configurazione disponibile in beta.')}
            style={({ pressed }) => ({
              backgroundColor: pressed ? palette.bgElevated : palette.bgRaised,
              borderRadius: radius.md,
              padding: spacing.lg,
              marginBottom: spacing.sm,
            })}>
            <Text style={{ color: palette.text, fontSize: 16 }}>{label}</Text>
          </Pressable>
        ),
      )}

      <Pressable
        onPress={signOut}
        style={({ pressed }) => ({
          backgroundColor: pressed ? palette.bgElevated : 'transparent',
          borderRadius: radius.md,
          padding: spacing.lg,
          marginTop: spacing.xl,
          alignItems: 'center',
        })}>
        <Text style={{ color: palette.danger, fontSize: 16 }}>Esci</Text>
      </Pressable>

      <View
        style={{
          marginTop: spacing.xxl,
          padding: spacing.md,
          backgroundColor: palette.bgRaised,
          borderRadius: radius.md,
        }}>
        <Text style={[typography.caption, { textAlign: 'center' }]}>
          In crisi? Telefono Amico Italia 02 2327 2327. AI-Mind non sostituisce un terapeuta.
        </Text>
      </View>
    </ScrollView>
  );
}
