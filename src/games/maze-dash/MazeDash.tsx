import { useCallback, useEffect, useRef, useState } from 'react';
import { loadScores, submitScore, type ScoreEntry } from '../../lib/leaderboard';

const GAME_ID = 'maze-dash';
const CELL = 26;
const MOVE_INTERVAL_MS = 130;

const LEVELS = [
  { cols: 13, rows: 9, coins: 3 },
  { cols: 15, rows: 11, coins: 4 },
  { cols: 17, rows: 13, coins: 5 },
  { cols: 19, rows: 13, coins: 6 },
  { cols: 21, rows: 15, coins: 7 },
  { cols: 23, rows: 15, coins: 8 },
];

interface CellWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

type Maze = CellWalls[][];

const DIRS = [
  { key: 'top', dr: -1, dc: 0, opposite: 'bottom' },
  { key: 'right', dr: 0, dc: 1, opposite: 'left' },
  { key: 'bottom', dr: 1, dc: 0, opposite: 'top' },
  { key: 'left', dr: 0, dc: -1, opposite: 'right' },
] as const;

function generateMaze(cols: number, rows: number): Maze {
  const maze: Maze = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: true, right: true, bottom: true, left: true })),
  );
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = DIRS
      .map((d) => ({ ...d, nr: r + d.dr, nc: c + d.dc }))
      .filter((d) => d.nr >= 0 && d.nr < rows && d.nc >= 0 && d.nc < cols && !visited[d.nr][d.nc]);
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    maze[r][c][pick.key] = false;
    maze[pick.nr][pick.nc][pick.opposite] = false;
    visited[pick.nr][pick.nc] = true;
    stack.push([pick.nr, pick.nc]);
  }
  return maze;
}

/** BFS from the start cell through open walls — confirms the exit is actually reachable. */
function hasPathToExit(maze: Maze, cols: number, rows: number): boolean {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  while (queue.length) {
    const [r, c] = queue.shift()!;
    if (r === rows - 1 && c === cols - 1) return true;
    const cell = maze[r][c];
    for (const d of DIRS) {
      if (cell[d.key]) continue;
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || visited[nr][nc]) continue;
      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }
  return false;
}

/** Generates a fresh maze and verifies it's solvable before handing it back — regenerates if not. */
function generateSolvableMaze(cols: number, rows: number): Maze {
  for (let attempt = 0; attempt < 20; attempt++) {
    const maze = generateMaze(cols, rows);
    if (hasPathToExit(maze, cols, rows)) return maze;
  }
  // Should be unreachable — the recursive-backtracker always spans every cell —
  // but never hand back an unsolvable maze under any circumstance.
  throw new Error('Failed to generate a solvable maze');
}

function placeCoins(cols: number, rows: number, count: number): [number, number][] {
  const coins: [number, number][] = [];
  const taken = new Set(['0,0', `${rows - 1},${cols - 1}`]);
  while (coins.length < count) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = `${r},${c}`;
    if (taken.has(key)) continue;
    taken.add(key);
    coins.push([r, c]);
  }
  return coins;
}

function fmtTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Leaderboard({ scores }: { scores: ScoreEntry[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden" style={{ minWidth: 170 }}>
      <div className="border-b border-white/10 bg-white/5 px-3 py-2">
        <p className="text-xs font-semibold text-white/70">Best Runs</p>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {scores.length === 0 && <p className="text-xs text-white/30">No runs yet</p>}
        {scores.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium" style={{ color: ['#f8b800', '#bcbcbc', '#cd7f32'][i] ?? '#666' }}>
              #{i + 1}
            </span>
            <span className="text-xs text-white/90">{s.name}</span>
            <span className="text-xs font-semibold text-emerald-400">{s.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NameEntry({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name || '???');
      }}
      className="flex flex-col items-center gap-3"
    >
      <p className="text-xs text-white/60">Enter your name</p>
      <input
        className="rounded-md border border-white/20 bg-black text-center text-sm text-white px-3 py-1.5 focus:border-emerald-500/50 focus:outline-none"
        style={{ width: 120, textTransform: 'uppercase' }}
        maxLength={3}
        placeholder="AAA"
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 3))}
        autoFocus
      />
      <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
        Submit
      </button>
    </form>
  );
}

type Phase = 'title' | 'playing' | 'levelClear' | 'naming' | 'over';

export function MazeDash({ onExit, paused }: { onExit: () => void; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const [phase, setPhase] = useState<Phase>('title');
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores(GAME_ID).slice(0, 3));
  const [finalScore, setFinalScore] = useState({ score: 0, level: 1, rank: 0 });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);

  const g = useRef({
    maze: [] as Maze,
    cols: 0,
    rows: 0,
    player: { r: 0, c: 0 },
    coins: [] as [number, number][],
    collectedCoins: new Set<string>(),
    keys: {} as Record<string, boolean>,
    lastDir: null as null | 'top' | 'right' | 'bottom' | 'left',
    lastMove: 0,
    levelStart: 0,
    elapsed: 0,
    over: false,
  });

  const setupLevel = useCallback((idx: number) => {
    const cfg = LEVELS[idx];
    const maze = generateSolvableMaze(cfg.cols, cfg.rows);
    g.current.maze = maze;
    g.current.cols = cfg.cols;
    g.current.rows = cfg.rows;
    g.current.player = { r: 0, c: 0 };
    g.current.coins = placeCoins(cfg.cols, cfg.rows, cfg.coins);
    g.current.collectedCoins = new Set();
    g.current.lastMove = 0;
    g.current.levelStart = performance.now();
    g.current.elapsed = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { maze, cols, rows, player, coins, collectedCoins } = g.current;
    if (!maze.length) return;

    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Exit tile — bright, pulsing highlight so it's unmistakable at any maze size
    const pulse = 0.35 + 0.25 * Math.sin(performance.now() / 220);
    ctx.fillStyle = `rgba(52, 211, 153, ${pulse})`;
    ctx.fillRect((cols - 1) * CELL, (rows - 1) * CELL, CELL, CELL);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.strokeRect((cols - 1) * CELL + 1, (rows - 1) * CELL + 1, CELL - 2, CELL - 2);

    // Walls
    ctx.strokeStyle = '#3f3f4a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = maze[r][c];
        const x = c * CELL;
        const y = r * CELL;
        ctx.beginPath();
        if (cell.top) { ctx.moveTo(x, y); ctx.lineTo(x + CELL, y); }
        if (cell.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + CELL); }
        if (r === rows - 1 && cell.bottom) { ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); }
        if (c === cols - 1 && cell.right) { ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); }
        ctx.stroke();
      }
    }

    // Coins
    coins.forEach(([r, c]) => {
      if (collectedCoins.has(`${r},${c}`)) return;
      ctx.fillStyle = '#f8b800';
      ctx.beginPath();
      ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Exit glyph
    ctx.fillStyle = '#0a0a0d';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', (cols - 1) * CELL + CELL / 2, (rows - 1) * CELL + CELL / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Player
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(player.c * CELL + CELL / 2, player.r * CELL + CELL / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const finishLevel = useCallback(() => {
    const s = g.current;
    const timeSec = s.elapsed / 1000;
    const levelScore = Math.max(100, Math.round(600 - timeSec * 4)) + s.collectedCoins.size * 50;
    setScore((prev) => {
      const total = prev + levelScore;
      if (levelIdx + 1 >= LEVELS.length) {
        s.over = true;
        setFinalScore({ score: total, level: levelIdx + 1, rank: 0 });
        setPhase('naming');
      } else {
        setPhase('levelClear');
      }
      return total;
    });
  }, [levelIdx]);

  const loop = useCallback(() => {
    const s = g.current;
    if (s.over) return;
    const now = performance.now();
    if (!pausedRef.current) {
      s.elapsed = now - s.levelStart;

      let dir = s.lastDir && s.keys[s.lastDir] ? s.lastDir : null;
      if (!dir) {
        dir = (['top', 'right', 'bottom', 'left'] as const).find((d) => s.keys[d]) ?? null;
      }

      if (dir && now - s.lastMove > MOVE_INTERVAL_MS) {
        const cell = s.maze[s.player.r]?.[s.player.c];
        const move = DIRS.find((d) => d.key === dir)!;
        if (cell && !cell[dir]) {
          s.player = { r: s.player.r + move.dr, c: s.player.c + move.dc };
          s.lastMove = now;

          const posKey = `${s.player.r},${s.player.c}`;
          if (!s.collectedCoins.has(posKey) && s.coins.some(([r, c]) => r === s.player.r && c === s.player.c)) {
            s.collectedCoins.add(posKey);
          }

          if (s.player.r === s.rows - 1 && s.player.c === s.cols - 1) {
            finishLevel();
          }
        }
      }
    }

    draw();
    setElapsedMs(s.elapsed);
    setCoinsCollected(s.collectedCoins.size);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, finishLevel]);

  const startRun = useCallback(() => {
    setScore(0);
    setLevelIdx(0);
    setElapsedMs(0);
    setCoinsCollected(0);
    g.current.over = false;
    setupLevel(0);
    setPhase('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [setupLevel, loop]);

  const startNextLevel = useCallback(() => {
    const next = levelIdx + 1;
    setLevelIdx(next);
    setElapsedMs(0);
    setCoinsCollected(0);
    setupLevel(next);
    setPhase('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [levelIdx, setupLevel, loop]);

  const submitFinalScore = useCallback(
    (name: string) => {
      const { rank, top3 } = submitScore(GAME_ID, { name, score: finalScore.score, level: finalScore.level });
      setFinalScore((f) => ({ ...f, rank }));
      setScores(top3);
      setPhase('over');
    },
    [finalScore.score, finalScore.level],
  );

  useEffect(() => {
    const KEY_MAP: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
      ArrowUp: 'top', w: 'top', W: 'top',
      ArrowRight: 'right', d: 'right', D: 'right',
      ArrowDown: 'bottom', s: 'bottom', S: 'bottom',
      ArrowLeft: 'left', a: 'left', A: 'left',
    };
    const down = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (!dir) return;
      g.current.keys[dir] = true;
      g.current.lastDir = dir;
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (!dir) return;
      g.current.keys[dir] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cfg = LEVELS[levelIdx];
  const canvasW = cfg.cols * CELL;
  const canvasH = cfg.rows * CELL;

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 overflow-auto bg-black text-white" style={{ minHeight: '100%' }}>
      <div className="w-full max-w-[900px] flex items-center justify-between">
        <button onClick={onExit} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/40 hover:text-white">
          ← Store
        </button>
        {phase === 'playing' && (
          <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/60">
            <span>Level <span className="font-semibold text-white">{levelIdx + 1}</span>/{LEVELS.length}</span>
            <span>Score <span className="font-semibold text-white">{score}</span></span>
            <span>Time <span className="font-semibold text-white">{fmtTime(elapsedMs)}</span></span>
            <span>Coins <span className="font-semibold text-amber-400">{coinsCollected}/{cfg.coins}</span></span>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start w-full max-w-[900px] justify-center">
        {phase !== 'title' && (
          <div className="hidden lg:flex flex-col gap-4 w-[170px] shrink-0">
            <Leaderboard scores={scores} />
          </div>
        )}

        <div className="relative rounded-lg border border-white/10 overflow-hidden">
          {phase === 'title' ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-black/90 px-10 py-16">
              <h1 className="text-3xl font-bold text-white">Maze Dash</h1>
              <p className="max-w-xs text-center text-sm text-white/50">
                Race through a randomly generated maze to the exit, grabbing coins along the way. Six levels, each bigger than the last.
              </p>
              <p className="text-xs text-white/30">Arrow keys or WASD to move</p>
              <button onClick={startRun} className="mt-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                Start Game
              </button>
            </div>
          ) : (
            <canvas ref={canvasRef} width={canvasW} height={canvasH} style={{ display: 'block' }} />
          )}

          {phase === 'levelClear' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90">
              <p className="text-xl font-bold text-emerald-400">Level {levelIdx + 1} Clear!</p>
              <p className="text-sm text-white/50">Score: {score.toLocaleString()}</p>
              <button onClick={startNextLevel} className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                Next Level
              </button>
            </div>
          )}

          {phase === 'naming' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/95">
              <p className="text-xl font-bold text-emerald-400">You Escaped!</p>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-8 py-4 text-center">
                <p className="mb-1 text-xs text-white/50">Final Score</p>
                <p className="text-3xl font-bold text-white">{finalScore.score.toLocaleString()}</p>
                <p className="mt-1 text-xs text-white/40">All {LEVELS.length} levels cleared</p>
              </div>
              <NameEntry onSubmit={submitFinalScore} />
            </div>
          )}

          {phase === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90">
              <p className="text-xl font-bold text-emerald-400">You Escaped!</p>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-8 py-4 text-center">
                <p className="mb-1 text-xs text-white/50">Final Score</p>
                <p className="text-3xl font-bold text-white">{finalScore.score.toLocaleString()}</p>
                {finalScore.rank > 0 && <p className="mt-2 text-xs text-emerald-400">#{finalScore.rank} all time</p>}
              </div>
              <button onClick={startRun} className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
