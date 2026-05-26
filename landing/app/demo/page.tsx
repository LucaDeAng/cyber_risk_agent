'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'induction' | 'deepening' | 'suggestion' | 'integration' | 'awakening';

const PHASE_LABEL: Record<Phase, string> = {
  induction: 'Induzione',
  deepening: 'Approfondimento',
  suggestion: 'Suggestione',
  integration: 'Integrazione',
  awakening: 'Risveglio',
};

const PHASE_ORDER: Phase[] = [
  'induction',
  'deepening',
  'suggestion',
  'integration',
  'awakening',
];

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function stripPauseTags(s: string): string {
  return s.replace(/<pause:\d+ms>/g, ', ').replace(/<\/?emphasis>/g, '');
}

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>('induction');
  const [bpm, setBpm] = useState<number>(78);
  const [caption, setCaption] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'ended'>('idle');
  const [voiceMode, setVoiceMode] = useState<'on' | 'off'>('on');

  const wsRef = useRef<WebSocket | null>(null);
  const bpmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const speak = useCallback(
    (text: string) => {
      if (voiceMode === 'off' || typeof window === 'undefined' || !('speechSynthesis' in window))
        return;
      const utter = new SpeechSynthesisUtterance(stripPauseTags(text));
      utter.lang = 'it-IT';
      utter.rate = 0.82;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
    },
    [voiceMode],
  );

  const stop = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end' }));
      } catch {}
      wsRef.current.close();
    }
    wsRef.current = null;
    if (bpmIntervalRef.current) {
      clearInterval(bpmIntervalRef.current);
      bpmIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setStatus('ended');
  }, []);

  const start = useCallback(async () => {
    setStatus('connecting');
    setCaption('');
    setPhase('induction');

    let sessionId: string;
    try {
      const res = await fetch(`${BACKEND}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'demo-' + Math.random().toString(36).slice(2, 8),
          goal: 'layoff_resilience',
          duration_minutes: 1,
          language: 'it',
        }),
      });
      const body = await res.json();
      sessionId = body.session_id;
    } catch (e) {
      console.error(e);
      setStatus('idle');
      return;
    }

    const wsBase = BACKEND.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/api/session/${sessionId}/stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('live');
      // Emit a mock BPM walker towards calm
      let current = 82;
      bpmIntervalRef.current = setInterval(() => {
        const drift = Math.random() < 0.75 ? -1 : 1;
        current = Math.max(56, Math.min(96, current + drift));
        setBpm(current);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'bpm', bpm: current, ts_ms: Date.now() }));
        }
      }, 700);

      // Demo accelerator: in production the state machine waits 180s per phase.
      // For the demo we fast-forward through phases every 18s so a 90s recording
      // visits induction → deepening → suggestion → integration.
      let skipCount = 0;
      const skipper = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || skipCount >= 4) {
          clearInterval(skipper);
          return;
        }
        ws.send(JSON.stringify({ type: 'skip_phase' }));
        skipCount += 1;
      }, 18000);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'phase':
          setPhase(msg.phase);
          break;
        case 'text':
          setCaption((prev) => (prev + msg.text).slice(-360));
          break;
        case 'turn_complete':
          speak(msg.text);
          break;
        case 'session_complete':
          stop();
          break;
      }
    };

    ws.onclose = () => {
      if (bpmIntervalRef.current) {
        clearInterval(bpmIntervalRef.current);
        bpmIntervalRef.current = null;
      }
      setStatus((s) => (s === 'live' ? 'ended' : s));
    };
  }, [speak, stop]);

  useEffect(() => () => stop(), [stop]);

  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const breathDuration = bpm > 0 ? (60 / bpm).toFixed(2) : '1';

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1fr_minmax(280px,360px)] md:py-20">
        {/* ── Phone preview ─────────────────────────────────────── */}
        <section className="order-2 flex items-center justify-center md:order-1">
          <div className="w-full max-w-[360px] rounded-[44px] border border-bg-elevated bg-bg-raised p-3 shadow-2xl shadow-black/40">
            <div className="rounded-[34px] bg-bg px-5 pb-6 pt-8">
              {/* Phase indicator */}
              <div className="flex items-center gap-2">
                {PHASE_ORDER.map((p, i) => (
                  <div
                    key={p}
                    className={`h-1 flex-1 rounded ${
                      i <= phaseIdx ? 'bg-accent' : 'bg-bg-elevated'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-text-dim">
                {PHASE_LABEL[phase]}
              </p>

              {/* BPM ring */}
              <div className="relative my-10 flex h-60 w-full items-center justify-center">
                <div
                  className="absolute h-60 w-60 rounded-full border-2 border-accent/50"
                  style={{
                    animation:
                      bpm > 0 ? `breathe ${breathDuration}s ease-in-out infinite` : 'none',
                  }}
                />
                <div className="absolute h-32 w-32 rounded-full bg-bg-raised" />
                <div className="relative z-10 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-text-dim">BPM</p>
                  <p className="text-5xl font-light text-text">{bpm}</p>
                </div>
              </div>

              {/* Caption */}
              <div className="min-h-[120px] rounded-xl bg-bg-raised p-4 text-sm leading-relaxed text-text">
                <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-text-dim">
                  {status === 'live'
                    ? 'In sessione'
                    : status === 'connecting'
                      ? 'Connessione…'
                      : status === 'ended'
                        ? 'Sessione chiusa'
                        : 'In attesa'}
                </p>
                <p>{caption || (status === 'idle' ? 'Premi Inizia per cominciare.' : '…')}</p>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes breathe {
              0%, 100% { transform: scale(1); opacity: 0.55; }
              50% { transform: scale(1.08); opacity: 0.95; }
            }
          `}</style>
        </section>

        {/* ── Controls + copy ───────────────────────────────────── */}
        <section className="order-1 md:order-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-text-dim">Demo live</p>
          <h1 className="mt-3 text-3xl font-light leading-tight md:text-4xl">
            Una sessione di <span className="text-accent">Layoff&nbsp;Resilience</span> in 60 secondi.
          </h1>
          <p className="mt-5 text-text-dim">
            Il backend FastAPI emette frase per frase. Il battito (simulato qui) decide quando
            la fase avanza. La voce è la Web Speech API del tuo browser.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {status !== 'live' ? (
              <button
                onClick={start}
                disabled={status === 'connecting'}
                className="rounded-full bg-accent px-6 py-3 font-semibold text-bg transition hover:bg-accent-deep disabled:opacity-50">
                {status === 'connecting' ? 'Connessione…' : 'Inizia la demo'}
              </button>
            ) : (
              <button
                onClick={stop}
                className="rounded-full bg-bg-raised px-6 py-3 font-semibold text-text border border-bg-elevated hover:bg-bg-elevated">
                Interrompi
              </button>
            )}

            <button
              onClick={() => setVoiceMode((m) => (m === 'on' ? 'off' : 'on'))}
              className="rounded-full border border-bg-elevated px-5 py-3 text-text-dim hover:text-text">
              Voce: {voiceMode === 'on' ? 'ON' : 'OFF'}
            </button>
          </div>

          <ul className="mt-10 space-y-3 text-sm text-text-dim">
            <li>
              <span className="text-accent">◆</span> Il battito parte alto, scende verso la calma.
            </li>
            <li>
              <span className="text-accent">◆</span> A fase stabile cambia automaticamente da
              induzione → approfondimento.
            </li>
            <li>
              <span className="text-accent">◆</span> Ogni frase è generata dal motore (in modalità
              offline: 15 script ericksoniani).
            </li>
            <li>
              <span className="text-accent">◆</span> Versione live: voce ElevenLabs, dialogo
              Claude opus-4-7 adattivo sulla tua voce.
            </li>
          </ul>

          <p className="mt-10 text-xs text-text-dim">
            Backend: <code className="text-accent">{BACKEND}</code>
          </p>
        </section>
      </div>
    </main>
  );
}
