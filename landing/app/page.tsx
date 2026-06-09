import { BreathingOrb } from '@/components/BreathingOrb';
import { WaitlistForm } from '@/components/WaitlistForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-32">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-text-dim">
              Closed beta · primavera 2026
            </p>
            <h1 className="text-5xl font-light leading-tight text-text md:text-6xl">
              Ipnosi generativa
              <br />
              <span className="text-accent">guidata dal tuo battito.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-text-dim">
              AI-Mind conduce sessioni di trance di 28 minuti che si adattano in tempo reale al
              tuo battito cardiaco e alla tua voce. Pensate per chi attraversa burnout, layoff
              tech, o un cambiamento che brucia.
            </p>
            <div className="mt-8 max-w-md">
              <WaitlistForm />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <BreathingOrb />
          </div>
        </div>
      </section>

      {/* ── Problema ─────────────────────────────────────────────────── */}
      <section className="border-t border-bg-raised px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.3em] text-text-dim">Il momento</p>
          <h2 className="mt-3 text-3xl font-light text-text md:text-4xl">
            530.000 layoff tech.{' '}
            <span className="text-text-dim">Stress senza precedenti tra professionisti che non si erano mai sentiti fragili.</span>
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                k: '67%',
                v: 'di chi ha accesso a piani di terapia non li utilizza per stigma o lentezza.',
              },
              {
                k: '3am',
                v: 'è l\'ora in cui la mente di chi ha perso il lavoro non smette di girare.',
              },
              {
                k: '0',
                v: 'i big player nel mercato dell\'ipnosi generativa AI-native. Il white space è ora.',
              },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-bg-raised p-6">
                <p className="text-5xl font-light text-accent">{s.k}</p>
                <p className="mt-3 text-text-dim">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Soluzione ────────────────────────────────────────────────── */}
      <section className="border-t border-bg-raised px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.3em] text-text-dim">La nostra risposta</p>
          <h2 className="mt-3 text-3xl font-light text-text md:text-4xl">
            Non un'app di meditazione. Un{' '}
            <span className="text-accent">protocollo di ipnosi adattiva</span>.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              {
                t: 'L\'AI conduce, non recita',
                d: 'Claude scrive lo script frase per frase. Si adatta a quello che dici, al ritmo del tuo respiro, alla profondità del tuo battito.',
              },
              {
                t: 'Il tuo battito è il timone',
                d: 'BPM dal tuo Apple Watch o Polar H10. Se il battito sale, la voce rallenta. Se scendi, la suggestione si fa più profonda.',
              },
              {
                t: '28 minuti, occhi chiusi',
                d: 'Cuffie e benda. Cinque fasi: induzione, approfondimento, suggestione, integrazione, risveglio. Esci diverso.',
              },
              {
                t: 'Il tuo te del futuro',
                d: 'Nel protocollo "Layoff Resilience" incontri il tuo te a 18 mesi. Calmo. Impiegato in qualcosa che ha senso. Ti parla.',
              },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-bg-raised p-6">
                <h3 className="text-xl text-text">{b.t}</h3>
                <p className="mt-2 text-text-dim">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocolli ───────────────────────────────────────────────── */}
      <section className="border-t border-bg-raised px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.3em] text-text-dim">Protocolli</p>
          <div className="mt-12 space-y-4">
            {[
              {
                t: 'Layoff Resilience',
                len: '28 min',
                d: 'Incontra il tuo te del futuro. Per chi è uscito da un\'azienda che sembrava per sempre.',
              },
              {
                t: 'Sonno profondo',
                len: '24 min',
                d: 'Trance dolce verso il sonno. Per le 3 di notte in cui la mente non si spegne.',
              },
              {
                t: 'Recupero focus',
                len: '18 min',
                d: 'Disconnetti, ricarica, riemergi. Per le giornate in cui ogni notifica brucia.',
              },
            ].map((p) => (
              <div
                key={p.t}
                className="flex items-center justify-between rounded-2xl border border-bg-raised p-6">
                <div>
                  <h3 className="text-xl text-text">{p.t}</h3>
                  <p className="mt-1 text-text-dim">{p.d}</p>
                </div>
                <span className="text-text-dim">{p.len}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────── */}
      <section className="border-t border-bg-raised px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-text-dim">Privacy by design</p>
          <h2 className="mt-3 text-3xl font-light text-text md:text-4xl">
            La tua voce non viene <span className="text-accent">mai</span> salvata.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-text-dim">
            L'audio resta in memoria per qualche secondo, solo il tempo di trascriverlo. Quello
            che persistiamo sono embedding semantici anonimi, base dell'apprendimento del modello.
            Privacy come moat, non come vincolo. Server EU.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-bg-raised px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-light text-text md:text-4xl">
            Apriamo a un piccolo gruppo.
          </h2>
          <p className="mt-4 text-text-dim">
            Iscriviti per essere tra i primi 500 invitati al closed beta.
          </p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-bg-raised px-6 py-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-text-dim md:flex-row">
          <p>© 2026 AI-Mind</p>
          <p className="text-center text-xs">
            AI-Mind non è un dispositivo medico né sostituisce la terapia. Se sei in crisi:
            Telefono Amico Italia 02 2327 2327.
          </p>
        </div>
      </footer>
    </main>
  );
}
