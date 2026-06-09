/**
 * Session player — the heart of AI-Mind.
 *
 * UX intent: low-luminance, single tap to pause, voice-driven. Once started,
 * the user is expected to close their eyes. We use expo-keep-awake to prevent
 * screen lock and the only visible affordances are BPM ring + phase progress.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BpmRing } from '../../components/BpmRing';
import { PhaseIndicator, type Phase } from '../../components/PhaseIndicator';
import { palette, radius, spacing, typography } from '../../constants/theme';
import { buildSessionWsUrl, endSession, startSession, type Goal } from '../../lib/api';
import { TtsChunkPlayer } from '../../lib/audioPlayer';
import { MockBpmSource, createBpmSource, type BpmSource } from '../../lib/biometrics';
import { supabase } from '../../lib/supabase';

export default function Session() {
  const { goal } = useLocalSearchParams<{ goal: Goal }>();
  const [phase, setPhase] = useState<Phase>('induction');
  const [bpm, setBpm] = useState<number>(0);
  const [caption, setCaption] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [crisisActive, setCrisisActive] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<TtsChunkPlayer | null>(null);
  const bpmSourceRef = useRef<BpmSource | null>(null);
  const [bpmLabel, setBpmLabel] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    let sessionId: string | null = null;

    async function boot() {
      await activateKeepAwakeAsync('aimind-session');

      const player = new TtsChunkPlayer();
      await player.init();
      if (!mounted) return;
      playerRef.current = player;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? 'anonymous-' + Date.now();

      const { session_id } = await startSession({
        userId,
        goal: goal as Goal,
        durationMinutes: 28,
      });
      sessionId = session_id;
      if (!mounted) return;

      const ws = new WebSocket(buildSessionWsUrl(session_id));
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = (e) => console.warn('ws error', e);
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data as string);
        switch (msg.type) {
          case 'ready':
            playerRef.current?.setClientTtsMode(!!msg.client_tts_required);
            break;
          case 'phase':
            setPhase(msg.phase);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            break;
          case 'text':
            setCaption((prev) => (prev + msg.text).slice(-400));
            break;
          case 'audio_chunk':
            await playerRef.current?.enqueueB64(msg.b64);
            break;
          case 'turn_complete':
            await playerRef.current?.speakClientSide(msg.text);
            break;
          case 'crisis_handoff':
            setCrisisActive(true);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              'Siamo qui',
              "Quello che hai detto ci ha colpito. Parla con qualcuno adesso:\n\nTelefono Amico Italia: 02 2327 2327",
              [{ text: 'Chiudi sessione', onPress: () => router.back() }],
              { cancelable: false },
            );
            break;
          case 'session_complete':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)/home');
            break;
        }
      };

      const bpmSource = await createBpmSource();
      bpmSourceRef.current = bpmSource;
      setBpmLabel(bpmSource.label);
      try {
        await bpmSource.start((value, tsMs) => {
          setBpm(value);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'bpm', bpm: value, ts_ms: tsMs }));
          }
        });
      } catch (err) {
        console.warn('bpm source failed, falling back to mock', err);
        const mock = new MockBpmSource();
        bpmSourceRef.current = mock;
        setBpmLabel(mock.label);
        mock.start((value, tsMs) => {
          setBpm(value);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'bpm', bpm: value, ts_ms: tsMs }));
          }
        });
      }
    }

    boot().catch((err) => {
      console.error(err);
      Alert.alert('Errore', 'Impossibile iniziare la sessione. Riprova.');
      router.back();
    });

    return () => {
      mounted = false;
      bpmSourceRef.current?.stop();
      playerRef.current?.stopAndClear();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end' }));
        wsRef.current.close();
      }
      if (sessionId) endSession(sessionId).catch(() => {});
      deactivateKeepAwake('aimind-session');
    };
  }, [goal]);

  async function handleExit() {
    Alert.alert('Interrompere la sessione?', 'Puoi sempre ricominciare quando vuoi.', [
      { text: 'Continua', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  }

  return (
    <Pressable
      onLongPress={handleExit}
      delayLongPress={1200}
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xxl,
      }}>
      <View style={{ marginBottom: spacing.lg }}>
        <PhaseIndicator phase={phase} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <BpmRing bpm={bpm} size={260} />
        {bpmLabel ? (
          <Text style={[typography.caption, { marginTop: spacing.md }]}>{bpmLabel}</Text>
        ) : null}
      </View>

      <View
        style={{
          minHeight: 120,
          backgroundColor: palette.bgRaised,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}>
        <Text style={[typography.caption, { marginBottom: spacing.xs }]}>
          {connected ? 'In sessione' : 'Connessione…'}
        </Text>
        <Text style={[typography.body, { color: palette.text }]}>{caption || '…'}</Text>
      </View>

      {crisisActive ? null : (
        <Text style={[typography.caption, { textAlign: 'center' }]}>
          Tieni premuto per uscire. Chiudi gli occhi quando sei pronto.
        </Text>
      )}
    </Pressable>
  );
}
