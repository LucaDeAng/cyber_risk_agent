export function BreathingOrb() {
  return (
    <div className="relative flex h-72 w-72 items-center justify-center md:h-96 md:w-96">
      <div className="absolute h-full w-full animate-breathe-slow rounded-full bg-accent/15 blur-2xl" />
      <div className="absolute h-3/4 w-3/4 animate-breathe rounded-full border border-accent/40" />
      <div className="absolute h-1/2 w-1/2 rounded-full bg-bg-raised" />
      <div className="relative z-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-text-dim">BPM</p>
        <p className="text-5xl font-light text-text">68</p>
      </div>
    </div>
  );
}
