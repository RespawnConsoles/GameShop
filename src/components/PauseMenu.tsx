interface PauseMenuProps {
  onResume: () => void;
  onExit: () => void;
}

export function PauseMenu({ onResume, onExit }: PauseMenuProps) {
  return (
    <div
      className="retro-game fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="flex flex-col items-center gap-6 px-12 py-10"
        style={{ border: '4px solid #fcfcfc', background: '#0a0a0a', fontFamily: 'var(--font-nes), monospace' }}
      >
        <p className="text-[16px] tracking-widest" style={{ color: '#f8b800' }}>PAUSED</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            autoFocus
            className="px-6 py-2.5 text-[10px] text-black hover:opacity-90"
            style={{ background: '#f8b800' }}
          >
            ▶ RESUME
          </button>
          <button
            onClick={onExit}
            className="px-6 py-2.5 text-[10px] text-white border-2 border-white/40 hover:border-white hover:bg-white/5"
          >
            ■ EXIT TO STORE
          </button>
        </div>
        <p className="text-[7px] text-white/30">PRESS ESC TO RESUME</p>
      </div>
    </div>
  );
}
