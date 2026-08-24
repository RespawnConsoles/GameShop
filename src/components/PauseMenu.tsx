interface PauseMenuProps {
  onResume: () => void;
  onExit: () => void;
}

export function PauseMenu({ onResume, onExit }: PauseMenuProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}
    >
      <div className="flex flex-col items-center gap-6 rounded-xl border border-white/10 bg-[#0a0a0a] px-12 py-10">
        <p className="text-xl font-semibold tracking-wide text-white">Paused</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            autoFocus
            className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            ▶ Resume
          </button>
          <button
            onClick={onExit}
            className="rounded-md border border-white/20 px-6 py-2.5 text-sm text-white/80 hover:border-white/40 hover:bg-white/5"
          >
            ■ Exit to Store
          </button>
        </div>
        <p className="text-xs text-white/30">Press Esc to resume</p>
      </div>
    </div>
  );
}
