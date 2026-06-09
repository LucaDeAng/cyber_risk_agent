/**
 * Entry route.
 *
 * In offline/dev mode (no Supabase configured) we skip the auth screen entirely
 * and route to home with an anonymous local user id.
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { palette } from '../constants/theme';
import { supabase, supabaseConfigured } from '../lib/supabase';

export default function Index() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthed(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });
  }, []);

  if (authed === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.bg,
        }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return <Redirect href={authed ? '/(tabs)/home' : '/(auth)/welcome'} />;
}
