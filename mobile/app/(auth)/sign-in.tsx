import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { palette, radius, spacing, typography } from '../../constants/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendMagicLink() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'aimind://callback' },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Errore', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
        }}>
        <Text style={[typography.title, { color: palette.text, marginBottom: spacing.lg }]}>
          {sent ? 'Controlla la tua email' : 'Accedi'}
        </Text>

        {!sent && (
          <>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="email@dominio.com"
              placeholderTextColor={palette.textDim}
              value={email}
              onChangeText={setEmail}
              style={{
                color: palette.text,
                backgroundColor: palette.bgRaised,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                fontSize: 16,
                marginBottom: spacing.lg,
              }}
            />

            <Pressable
              disabled={!email || loading}
              onPress={sendMagicLink}
              style={({ pressed }) => ({
                opacity: !email || loading ? 0.5 : 1,
                backgroundColor: pressed ? palette.accentDeep : palette.accent,
                borderRadius: radius.pill,
                paddingVertical: spacing.md,
                alignItems: 'center',
              })}>
              <Text style={{ color: palette.bg, fontSize: 17, fontWeight: '600' }}>
                {loading ? 'Invio…' : 'Invia magic link'}
              </Text>
            </Pressable>
          </>
        )}

        {sent && (
          <>
            <Text style={[typography.body, { color: palette.textDim, marginBottom: spacing.lg }]}>
              Ti abbiamo inviato un link a {email}. Aprilo dallo stesso dispositivo per accedere.
            </Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/home')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? palette.bgElevated : palette.bgRaised,
                borderRadius: radius.pill,
                paddingVertical: spacing.md,
                alignItems: 'center',
              })}>
              <Text style={{ color: palette.text, fontSize: 17 }}>Continua come ospite</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
