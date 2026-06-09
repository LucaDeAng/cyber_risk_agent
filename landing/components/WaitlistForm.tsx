'use client';

import { useState } from 'react';

type Status = 'idle' | 'submitting' | 'ok' | 'error';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('ok');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore');
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-2xl border border-accent/30 bg-bg-raised p-6 text-center">
        <p className="text-2xl text-text">Sei in lista.</p>
        <p className="mt-2 text-text-dim">
          Ti scriveremo non appena apriamo il closed beta. Niente spam, promesso.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        placeholder="email@dominio.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-bg-elevated bg-bg-raised px-4 py-3 text-text placeholder-text-dim focus:border-accent focus:outline-none"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full rounded-xl border border-bg-elevated bg-bg-raised px-4 py-3 text-text focus:border-accent focus:outline-none"
        required>
        <option value="">Stai attraversando…</option>
        <option value="layoff">Un layoff o ristrutturazione</option>
        <option value="burnout">Burnout o sovraccarico</option>
        <option value="career_pivot">Un cambio di carriera</option>
        <option value="insomnia">Insonnia notturna</option>
        <option value="curiosity">Solo curiosità</option>
      </select>
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-full bg-accent py-3 text-bg font-semibold transition hover:bg-accent-deep disabled:opacity-50">
        {status === 'submitting' ? 'Aggiungo…' : 'Entra nel closed beta'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-warm">Qualcosa è andato storto. {errorMsg}</p>
      )}
      <p className="text-center text-xs text-text-dim">
        Trattiamo la tua email secondo il GDPR. Vedi /privacy.
      </p>
    </form>
  );
}
