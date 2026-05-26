import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = (Constants.expoConfig?.extra?.supabaseUrl as string) ?? '';
const supabaseAnonKey = (Constants.expoConfig?.extra?.supabaseAnonKey as string) ?? '';

export const supabaseConfigured =
  !!supabaseUrl && supabaseUrl !== '__SET_IN_ENV__' && !!supabaseAnonKey;

/**
 * In offline/dev mode we never call Supabase. The proxy below short-circuits
 * the auth surface so the rest of the app can pretend a session always exists
 * (with a stable anonymous user id stored locally).
 */

const ANON_USER_KEY = 'aimind.anonymous_user_id';

async function getOrCreateAnonId(): Promise<string> {
  let id = await AsyncStorage.getItem(ANON_USER_KEY);
  if (!id) {
    id = 'anon-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    await AsyncStorage.setItem(ANON_USER_KEY, id);
  }
  return id;
}

function buildOfflineStub(): SupabaseClient {
  const auth = {
    async getSession() {
      const id = await getOrCreateAnonId();
      return { data: { session: { user: { id, email: null } } }, error: null };
    },
    async getUser() {
      const id = await getOrCreateAnonId();
      return { data: { user: { id, email: null } }, error: null };
    },
    async signInWithOtp() {
      return { data: null, error: { message: 'Supabase non configurato — modalità offline.' } };
    },
    async signOut() {
      await AsyncStorage.removeItem(ANON_USER_KEY);
      return { error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  };
  // We only stub what the app touches today.
  return { auth } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : buildOfflineStub();
