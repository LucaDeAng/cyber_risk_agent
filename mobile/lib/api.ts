import Constants from 'expo-constants';

const BACKEND_URL =
  (Constants.expoConfig?.extra?.backendUrl as string) ?? 'http://localhost:8000';

export type Goal = 'sleep' | 'focus_recovery' | 'layoff_resilience';

export type StartSessionResponse = {
  session_id: string;
  ws_url: string;
};

export async function startSession(params: {
  userId: string;
  goal: Goal;
  durationMinutes: number;
  language?: 'it' | 'en' | 'es' | 'de' | 'fr';
}): Promise<StartSessionResponse> {
  const res = await fetch(`${BACKEND_URL}/api/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.userId,
      goal: params.goal,
      duration_minutes: params.durationMinutes,
      language: params.language ?? 'it',
    }),
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.status}`);
  return res.json();
}

export function buildSessionWsUrl(sessionId: string): string {
  const base = BACKEND_URL.replace(/^http/, 'ws');
  return `${base}/api/session/${sessionId}/stream`;
}

export async function endSession(sessionId: string): Promise<void> {
  await fetch(`${BACKEND_URL}/api/session/${sessionId}/end`, { method: 'POST' });
}
