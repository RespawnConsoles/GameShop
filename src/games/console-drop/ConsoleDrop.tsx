import { useEffect, useRef, useState, useCallback } from 'react';
import { playCatch, playCatchRare, playMiss, playGameStart, playGameOver, playSubmit } from '../../lib/sounds';
import { loadScores, submitScore, type ScoreEntry } from '../../lib/leaderboard';

const GAME_ID = 'console-drop';
const W = 480;
const H = 560;
const PADDLE_W = 100;
const PADDLE_H = 14;
const PADDLE_Y = H - 48;
const PADDLE_SPEED = 7;
const ITEM_W = 72;
const ITEM_H = 28;

const CONSOLE_TYPES = [
  { label: 'PS5', color: '#0058f8', glow: '#003ab8', pts: 10, weight: 38 },
  { label: 'XBOX', color: '#00b800', glow: '#005200', pts: 10, weight: 38 },
  { label: 'SWITCH', color: '#d82800', glow: '#8a1a00', pts: 15, weight: 18 },
  { label: 'RETRO', color: '#f8b800', glow: '#a07a00', pts: 25, weight: 6 },
];

function pickType() {
  const total = CONSOLE_TYPES.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const type of CONSOLE_TYPES) {
    roll -= type.weight;
    if (roll <= 0) return type;
  }
  return CONSOLE_TYPES[0];
}

interface Item {
  x: number;
  y: number;
  speed: number;
  type: (typeof CONSOLE_TYPES)[number];
}

function makeItem(level: number): Item {
  const type = pickType();
  return {
    x: Math.random() * (W - ITEM_W - 8) + 4,
    y: -ITEM_H,
    speed: 2 + level * 0.6 + Math.random() * 1.2,
    type,
  };
}

function Leaderboard({ scores }: { scores: ScoreEntry[] }) {
  return (
    <div style={{ border: '4px solid #fcfcfc', background: '#000', minWidth: 140 }}>
      <div style={{ background: '#f8b800', borderBottom: '4px solid #fcfcfc', padding: '4px 8px' }}>
        <p className="text-[8px]" style={{ color: '#000' }}>★ TOP SCORES</p>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {scores.length === 0 && <p className="text-[7px]" style={{ color: '#444' }}>NO SCORES YET</p>}
        {scores.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-[8px]" style={{ color: ['#f8b800', '#bcbcbc', '#cd7f32'][i] ?? '#555' }}>
              {['1ST', '2ND', '3RD'][i]}
            </span>
            <span className="text-[8px]" style={{ color: '#fcfcfc' }}>{s.name}</span>
            <span className="text-[8px]" style={{ color: '#00b800' }}>{String(s.score).padStart(6, '0')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NameEntry({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  function doSubmit() {
    onSubmit(name || '???');
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doSubmit();
      }}
      className="flex flex-col items-center gap-3"
    >
      <p className="text-[8px]" style={{ color: '#bcbcbc' }}>ENTER YOUR NAME</p>
      <input
        className="text-center border-2 border-white/30 bg-black text-white px-2 py-1"
        style={{ width: 120, textTransform: 'uppercase', fontFamily: 'var(--font-nes), monospace', fontSize: 10 }}
        maxLength={3}
        placeholder="AAA"
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 3))}
        autoFocus
      />
      <button type="submit" className="border-2 border-white px-4 py-2 text-[9px] text-white hover:bg-white/10">
        ▶ SUBMIT
      </button>
    </form>
  );
}

export function ConsoleDrop({ onExit, paused }: { onExit: () => void; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const g = useRef({
    paddleX: W / 2 - PADDLE_W / 2,
    items: [] as Item[],
    score: 0,
    lives: 3,
    level: 1,
    caught: 0,
    frame: 0,
    keys: { left: false, right: false },
    over: false,
    flashes: [] as { x: number; y: number; label: string; alpha: number; color: string }[],
  });

  const [ui, setUi] = useState({ score: 0, lives: 3, level: 1 });
  const [phase, setPhase] = useState<'title' | 'playing' | 'naming' | 'over'>('title');
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores(GAME_ID).slice(0, 3));
  const [finalScore, setFinalScore] = useState({ score: 0, level: 1, rank: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = g.current;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#fcfcfc';
    ctx.fillRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = '#555';
    ctx.fillRect(s.paddleX + 4, PADDLE_Y + 4, PADDLE_W - 8, 2);

    s.items.forEach((item) => {
      ctx.fillStyle = item.type.color;
      ctx.fillRect(item.x, item.y, ITEM_W, ITEM_H);
      ctx.fillStyle = item.type.glow;
      ctx.fillRect(item.x + ITEM_W - 4, item.y, 4, ITEM_H);
      ctx.fillRect(item.x, item.y + ITEM_H - 4, ITEM_W, 4);
      ctx.fillStyle = '#fcfcfc';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.type.label, item.x + ITEM_W / 2, item.y + 18);
    });

    s.flashes = s.flashes.filter((f) => f.alpha > 0);
    s.flashes.forEach((f) => {
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.label, f.x, f.y);
      f.y -= 1.2;
      f.alpha -= 0.03;
    });
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#d82800';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, PADDLE_Y + PADDLE_H + 4);
    ctx.lineTo(W, PADDLE_Y + PADDLE_H + 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.over) return;
    if (pausedRef.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (s.keys.left && s.paddleX > 0) s.paddleX -= PADDLE_SPEED;
    if (s.keys.right && s.paddleX < W - PADDLE_W) s.paddleX += PADDLE_SPEED;

    const spawnRate = Math.max(40, 90 - s.level * 8);
    if (s.frame % spawnRate === 0) s.items.push(makeItem(s.level));
    s.frame++;

    const alive: Item[] = [];
    for (const item of s.items) {
      item.y += item.speed;
      if (
        item.y + ITEM_H >= PADDLE_Y &&
        item.y <= PADDLE_Y + PADDLE_H &&
        item.x + ITEM_W > s.paddleX &&
        item.x < s.paddleX + PADDLE_W
      ) {
        s.score += item.type.pts;
        s.caught += 1;
        s.level = Math.floor(s.caught / 8) + 1;
        s.flashes.push({ x: item.x + ITEM_W / 2, y: item.y, label: `+${item.type.pts}`, alpha: 1, color: item.type.color });
        item.type.label === 'RETRO' ? playCatchRare() : playCatch();
        setUi({ score: s.score, lives: s.lives, level: s.level });
        continue;
      }
      if (item.y > H) {
        s.lives -= 1;
        s.flashes.push({ x: W / 2, y: H - 60, label: 'MISS!', alpha: 1, color: '#d82800' });
        playMiss();
        setUi({ score: s.score, lives: s.lives, level: s.level });
        if (s.lives <= 0) {
          s.over = true;
          playGameOver();
          setFinalScore({ score: s.score, level: s.level, rank: 0 });
          setPhase('naming');
          return;
        }
        continue;
      }
      alive.push(item);
    }
    s.items = alive;
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const startGame = useCallback(() => {
    const s = g.current;
    s.paddleX = W / 2 - PADDLE_W / 2;
    s.items = [];
    s.score = 0;
    s.lives = 3;
    s.level = 1;
    s.caught = 0;
    s.frame = 0;
    s.over = false;
    s.flashes = [];
    setUi({ score: 0, lives: 3, level: 1 });
    playGameStart();
    setPhase('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const submitFinalScore = useCallback(
    (name: string) => {
      playSubmit();
      const { rank, top3 } = submitScore(GAME_ID, { name, score: finalScore.score, level: finalScore.level });
      setFinalScore((f) => ({ ...f, rank }));
      setScores(top3);
      setPhase('over');
    },
    [finalScore.score, finalScore.level],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') g.current.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') g.current.keys.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') g.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') g.current.keys.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointer = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    g.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, (clientX - rect.left) * scaleX - PADDLE_W / 2));
  }, []);

  return (
    <div
      className="retro-game flex flex-col items-center gap-4 py-8 px-4 overflow-y-auto"
      style={{ background: '#000', minHeight: '100%', fontFamily: 'var(--font-nes), monospace' }}
    >
      <div className="w-full max-w-[760px]">
        <div className="flex justify-between items-center px-4 py-2" style={{ border: '4px solid #fcfcfc', background: '#0a0a0a' }}>
          <span className="text-[9px]" style={{ color: '#f8b800' }}>
            SCORE: <span style={{ color: '#fcfcfc' }}>{String(ui.score).padStart(6, '0')}</span>
          </span>
          <span className="text-[9px]" style={{ color: '#f8b800' }}>
            LVL: <span style={{ color: '#fcfcfc' }}>{ui.level}</span>
          </span>
          <span className="text-[9px]" style={{ color: '#d82800' }}>
            {'♥'.repeat(ui.lives)}
            <span style={{ color: '#333' }}>{'♥'.repeat(Math.max(0, 3 - ui.lives))}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start w-full max-w-[760px]">
        <div className="hidden lg:flex flex-col gap-4 w-[140px] shrink-0">
          <Leaderboard scores={scores} />
        </div>

        <div style={{ position: 'relative', border: '4px solid #fcfcfc', flex: '0 0 auto', maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: 'block', maxWidth: '100%', height: 'auto', cursor: 'none' }}
            onMouseMove={(e) => phase === 'playing' && handlePointer(e.clientX)}
          />

          {phase === 'title' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(0,0,0,0.92)', zIndex: 10 }}>
              <p className="text-[9px]" style={{ color: '#f8b800' }}>★ ★ ★ ★ ★ ★ ★</p>
              <p className="text-[20px]" style={{ color: '#fcfcfc' }}>CONSOLE</p>
              <p className="text-[20px]" style={{ color: '#00b800' }}>DROP</p>
              <p className="text-[8px] mt-2" style={{ color: '#bcbcbc', lineHeight: 2, textAlign: 'center' }}>
                CATCH THE FALLING CONSOLES.<br />MISS 3 AND IT&apos;S GAME OVER.
              </p>
              <p className="text-[8px]" style={{ color: '#555', lineHeight: 2 }}>← → / A D / MOUSE</p>
              <button onClick={startGame} className="mt-2 border-2 border-white px-4 py-2 text-[11px] text-white hover:bg-white/10">
                ▶ START GAME
              </button>
              <p className="text-[9px]" style={{ color: '#f8b800' }}>★ ★ ★ ★ ★ ★ ★</p>
            </div>
          )}

          {phase === 'naming' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 10 }}>
              <p className="text-[14px]" style={{ color: '#d82800' }}>GAME OVER</p>
              <div style={{ border: '4px solid #fcfcfc', padding: '16px 28px', background: '#0a0a0a', textAlign: 'center' }}>
                <p className="text-[8px] mb-1" style={{ color: '#bcbcbc' }}>FINAL SCORE</p>
                <p className="text-[22px]" style={{ color: '#f8b800' }}>{String(finalScore.score).padStart(6, '0')}</p>
                <p className="text-[7px] mt-1" style={{ color: '#555' }}>LVL {finalScore.level}</p>
              </div>
              <NameEntry onSubmit={submitFinalScore} />
            </div>
          )}

          {phase === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(0,0,0,0.92)', zIndex: 10 }}>
              <p className="text-[14px]" style={{ color: '#d82800' }}>GAME OVER</p>
              <div style={{ border: '4px solid #fcfcfc', padding: '16px 28px', background: '#0a0a0a', textAlign: 'center' }}>
                <p className="text-[8px] mb-1" style={{ color: '#bcbcbc' }}>FINAL SCORE</p>
                <p className="text-[22px]" style={{ color: '#f8b800' }}>{String(finalScore.score).padStart(6, '0')}</p>
                {finalScore.rank > 0 && (
                  <p className="text-[8px] mt-2" style={{ color: '#00b800' }}>#{finalScore.rank} ALL TIME</p>
                )}
              </div>
              <button onClick={startGame} className="border-2 border-white px-4 py-2 text-[9px] text-white hover:bg-white/10">
                ▶ PLAY AGAIN
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:flex flex-col gap-4 w-[140px] shrink-0">
          <button onClick={onExit} className="block text-center p-3 w-full" style={{ border: '4px solid #fcfcfc', background: '#0a0a0a' }}>
            <p className="text-[18px] mb-2">🏪</p>
            <p className="text-[7px] leading-loose" style={{ color: '#fcfcfc' }}>RETURN<br />TO STORE</p>
            <p className="text-[8px] mt-2" style={{ color: '#00b800' }}>▶ GO</p>
          </button>

          <div style={{ border: '4px solid #333', padding: '10px', background: '#0a0a0a' }}>
            <p className="text-[7px] mb-3" style={{ color: '#555' }}>POINT KEY</p>
            <div className="flex flex-col gap-2">
              {CONSOLE_TYPES.map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <div style={{ background: c.color, width: 8, height: 8, flexShrink: 0 }} />
                  <span className="text-[7px]" style={{ color: '#bcbcbc' }}>{c.label}</span>
                  <span className="text-[7px]" style={{ color: c.color }}>+{c.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden gap-3 w-full max-w-[480px]">
        <div className="flex-1"><Leaderboard scores={scores} /></div>
        <div className="flex flex-col gap-3 shrink-0">
          <button onClick={onExit} className="block text-center p-3" style={{ border: '4px solid #fcfcfc', background: '#0a0a0a' }}>
            <p className="text-[14px] mb-1">🏪</p>
            <p className="text-[7px] leading-loose" style={{ color: '#fcfcfc' }}>RETURN<br />TO STORE</p>
          </button>
        </div>
      </div>
    </div>
  );
}
