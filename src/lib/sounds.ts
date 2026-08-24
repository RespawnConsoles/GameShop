// ─────────────────────────────────────────────────────────────────────────────
// 8-bit sound effects — singleton AudioContext with iOS Safari support
// iOS requires AudioContext to be resumed inside a user gesture AND kept alive
// ─────────────────────────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      _ctx = new Ctor();
    }
    // iOS Safari starts AudioContext in "suspended" — resume it
    if (_ctx.state === "suspended") {
      _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
}

type Wave = "square" | "sawtooth" | "triangle" | "sine";

function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: Wave = "square",
  volume = 0.25
) {
  try {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.01);
  } catch { /* silent */ }
}

function play(fn: (ac: AudioContext, t: number) => void) {
  try {
    const ac = getCtx();
    if (!ac) return;
    fn(ac, ac.currentTime);
  } catch { /* silent */ }
}

// ── Sounds ────────────────────────────────────────────────────────────────────

export function playCatch() {
  play((ac, t) => {
    tone(ac, 523, t,        0.07);
    tone(ac, 659, t + 0.07, 0.07);
    tone(ac, 784, t + 0.14, 0.10);
  });
}

export function playCatchRare() {
  play((ac, t) => {
    tone(ac, 523,  t,        0.07);
    tone(ac, 659,  t + 0.07, 0.07);
    tone(ac, 784,  t + 0.14, 0.07);
    tone(ac, 1047, t + 0.21, 0.15, "square", 0.3);
  });
}

export function playMiss() {
  play((ac, t) => {
    tone(ac, 220, t,        0.12, "square", 0.3);
    tone(ac, 160, t + 0.10, 0.18, "square", 0.25);
    tone(ac, 110, t + 0.22, 0.20, "square", 0.2);
  });
}

export function playGameStart() {
  play((ac, t) => {
    const notes = [262, 330, 392, 330, 392, 523];
    const times = [0, 0.1, 0.2, 0.3, 0.35, 0.45];
    notes.forEach((freq, i) => tone(ac, freq, t + times[i], 0.12, "square", 0.28));
  });
}

export function playGameOver() {
  play((ac, t) => {
    const notes = [392, 370, 349, 330, 311, 294, 196];
    const durs  = [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.4];
    let offset  = 0;
    notes.forEach((freq, i) => {
      tone(ac, freq, t + offset, durs[i] + 0.05, "square", 0.28);
      offset += durs[i] + 0.02;
    });
  });
}

export function playSubmit() {
  play((ac, t) => {
    tone(ac, 659,  t,        0.08, "square", 0.25);
    tone(ac, 880,  t + 0.10, 0.08, "square", 0.25);
    tone(ac, 1047, t + 0.20, 0.14, "square", 0.3);
  });
}
