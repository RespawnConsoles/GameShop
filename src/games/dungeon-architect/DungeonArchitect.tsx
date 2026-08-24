import { useState, useEffect, useMemo } from 'react';
import {
  COLS, ROWS, ENTRANCE_ROW, EXIT_ROW,
  BLOCKADE, TRAPS, MONSTERS, LEVELS, SHOP_UPGRADES,
  type ItemDef, type LevelConfig, type TrapDef, type MonsterDef,
} from './dungeonData';

type CellType = 'empty' | 'wall' | 'entrance' | 'exit' | 'trap' | 'monster' | 'blockade';
interface Cell { type: CellType; itemId?: string; }
type Grid = Cell[][];

function computeEffectiveStats(purchases: Record<string, number>) {
  const traps: TrapDef[] = TRAPS.map(t => ({ ...t }));
  const monsters: MonsterDef[] = MONSTERS.map(m => ({ ...m }));
  let extraBudget = 0;
  let extraWalls = 0;
  for (const upg of SHOP_UPGRADES) {
    const count = purchases[upg.id] ?? 0;
    if (!count) continue;
    const { effect } = upg;
    if (effect.type === 'trap_dmg') {
      const t = traps.find(x => x.id === effect.target);
      if (t) t.damage += effect.amount * count;
    } else if (effect.type === 'poison_ticks') {
      const t = traps.find(x => x.id === effect.target);
      if (t && t.poisonTicks != null) t.poisonTicks = (t.poisonTicks ?? 0) + effect.amount * count;
    } else if (effect.type === 'monster_hp') {
      const m = monsters.find(x => x.id === effect.target);
      if (m) m.hp += effect.amount * count;
    } else if (effect.type === 'monster_atk') {
      const m = monsters.find(x => x.id === effect.target);
      if (m) m.atk += effect.amount * count;
    } else if (effect.type === 'extra_budget') {
      extraBudget += effect.amount * count;
    } else if (effect.type === 'extra_walls') {
      extraWalls += effect.amount * count;
    }
  }
  return { traps, monsters, extraBudget, extraWalls };
}

function makeGrid(): Grid {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c): Cell => {
      if (r === 0 || r === ROWS - 1) return { type: 'wall' };
      if (c === 0) return r === ENTRANCE_ROW ? { type: 'entrance' } : { type: 'wall' };
      if (c === COLS - 1) return r === EXIT_ROW ? { type: 'exit' } : { type: 'wall' };
      return { type: 'empty' };
    })
  );
}

function findPath(
  grid: Grid,
  heroAtk: number,
  heroArmor: number,
  effectiveTraps: TrapDef[],
  effectiveMonsters: MonsterDef[],
): [number, number][] | null {
  const tileCost = (r: number, c: number): number => {
    const cell = grid[r][c];
    if (cell.type === 'wall' || cell.type === 'blockade') return Infinity;
    if (cell.type === 'trap') {
      const t = effectiveTraps.find(x => x.id === cell.itemId);
      return t ? Math.round(t.damage * (1 - heroArmor / 100)) : 0;
    }
    if (cell.type === 'monster') {
      const m = effectiveMonsters.find(x => x.id === cell.itemId);
      if (!m) return 0;
      const rounds = Math.ceil(m.hp / heroAtk);
      let dmg = Math.round(rounds * m.atk * (1 - heroArmor / 100));
      if (m.ranged) dmg = Math.round(dmg * 1.3);
      return dmg;
    }
    return 0;
  };

  const INF = Infinity;
  const dist: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(INF));
  const prev: ([number, number] | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const visited = new Set<string>();
  const pq: [number, number, number][] = [];

  dist[ENTRANCE_ROW][0] = 0;
  pq.push([0, ENTRANCE_ROW, 0]);

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, r, c] = pq.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (r === EXIT_ROW && c === COLS - 1) break;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (visited.has(`${nr},${nc}`)) continue;
      const cost = tileCost(nr, nc);
      if (cost === INF) continue;
      const nd = d + cost;
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd;
        prev[nr][nc] = [r, c];
        pq.push([nd, nr, nc]);
      }
    }
  }

  if (dist[EXIT_ROW][COLS - 1] === INF) return null;
  const path: [number, number][] = [];
  let cur: [number, number] | null = [EXIT_ROW, COLS - 1];
  while (cur) { path.unshift(cur); cur = prev[cur[0]][cur[1]]; }
  return path;
}

interface SimStep { row: number; col: number; hp: number; event?: string; }

function simulate(
  grid: Grid,
  path: [number, number][],
  cfg: LevelConfig,
  effectiveTraps: TrapDef[],
  effectiveMonsters: MonsterDef[],
): SimStep[] {
  let hp = cfg.heroHP;
  let poisonTicks = 0;
  let poisonDmg = 0;
  const steps: SimStep[] = [];

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    const cell = grid[r][c];
    const events: string[] = [];
    let totalDmg = 0;

    if (poisonTicks > 0) {
      const d = Math.round(poisonDmg * (1 - cfg.heroArmor / 100));
      totalDmg += d; poisonTicks--;
      events.push(`☠️ Poison −${d}`);
    }

    if (i + 1 < path.length) {
      const [nr, nc] = path[i + 1];
      const next = grid[nr][nc];
      if (next.type === 'monster') {
        const m = effectiveMonsters.find(x => x.id === next.itemId);
        if (m?.ranged) {
          const d = Math.round(m.atk * 0.5 * (1 - cfg.heroArmor / 100));
          totalDmg += d;
          events.push(`🧙 Ranged −${d}`);
        }
      }
    }

    if (cell.type === 'trap') {
      const t = effectiveTraps.find(x => x.id === cell.itemId)!;
      const d = Math.round(t.damage * (1 - cfg.heroArmor / 100));
      totalDmg += d;
      events.push(`${t.emoji} ${t.name} −${d}`);
      if (t.poisonTicks) { poisonTicks = t.poisonTicks; poisonDmg = t.poisonDmg ?? 0; }
    } else if (cell.type === 'monster') {
      const m = effectiveMonsters.find(x => x.id === cell.itemId)!;
      const rounds = Math.ceil(m.hp / cfg.heroAtk);
      let d = Math.round(rounds * m.atk * (1 - cfg.heroArmor / 100));
      if (m.ranged) d = Math.round(d * 1.3);
      totalDmg += d;
      events.push(`${m.emoji} ${m.name} −${d} (${rounds} rds)`);
    }

    hp = Math.max(0, hp - totalDmg);
    steps.push({ row: r, col: c, hp, event: events.length ? events.join('  ') : undefined });
    if (hp <= 0) break;
  }
  return steps;
}

function upgradeCost(id: string, purchased: number): number {
  const upg = SHOP_UPGRADES.find(u => u.id === id)!;
  return Math.round(upg.baseCost * Math.pow(upg.costScaling, purchased));
}

let _actx: AudioContext | null = null;
function actx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_actx) try { _actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.22, endFreq?: number, startAt = 0) {
  const ctx = actx(); if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type;
  const t0 = ctx.currentTime + startAt;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.start(t0); osc.stop(t0 + dur);
}

function noiseBurst(dur: number, vol = 0.15, hpFreq = 0, startAt = 0) {
  const ctx = actx(); if (!ctx) return;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + startAt;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  if (hpFreq) {
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hpFreq;
    src.connect(f); f.connect(gain);
  } else { src.connect(gain); }
  gain.connect(ctx.destination);
  src.start(t0); src.stop(t0 + dur);
}

const SFX = {
  place: () => { tone(900, 0.06, 'square', 0.1); },
  remove: () => { tone(500, 0.07, 'square', 0.08, 200); },
  release: () => { tone(180, 0.15, 'sawtooth', 0.18, 90); noiseBurst(0.12, 0.12, 400); },
  purchase: () => { tone(660, 0.07, 'sine', 0.18); tone(880, 0.09, 'sine', 0.18, undefined, 0.07); },
  nextLevel: () => { [440, 550, 660, 880].forEach((f, i) => tone(f, 0.11, 'sine', 0.18, undefined, i * 0.06)); },
  unlock: () => { [330, 440, 550].forEach((f, i) => tone(f, 0.1, 'triangle', 0.16, undefined, i * 0.055)); },
  spike: () => { tone(1400, 0.04, 'square', 0.18, 300); noiseBurst(0.05, 0.12, 2500); },
  fire: () => { noiseBurst(0.18, 0.2, 150); tone(110, 0.15, 'sine', 0.14); },
  blade: () => { tone(700, 0.12, 'sawtooth', 0.18, 250); },
  poison: () => { tone(220, 0.18, 'sine', 0.13, 170); noiseBurst(0.1, 0.07, 600); },
  poisonTick: () => { tone(260, 0.09, 'sine', 0.09, 210); },
  crusher: () => { tone(70, 0.22, 'square', 0.28, 50); noiseBurst(0.1, 0.18, 80); },
  void_: () => { tone(55, 0.4, 'sine', 0.28, 28); tone(110, 0.3, 'sawtooth', 0.12, 35); },
  lava: () => { noiseBurst(0.18, 0.2, 900); tone(140, 0.2, 'sine', 0.18, 70); },
  acid: () => { noiseBurst(0.14, 0.12, 1800); tone(320, 0.14, 'sine', 0.09, 190); },
  temporal: () => { tone(440, 0.05, 'sine', 0.18, 880); tone(880, 0.05, 'sine', 0.14, 220, 0.05); tone(220, 0.28, 'sawtooth', 0.18, 55, 0.1); },
  combat: () => { noiseBurst(0.07, 0.14, 350); tone(190, 0.09, 'square', 0.13, 90); },
  ranged: () => { tone(620, 0.06, 'triangle', 0.13, 180); },
  heroSlain: () => { [220, 196, 175, 147].forEach((f, i) => tone(f, 0.22, 'sine', 0.22, undefined, i * 0.11)); },
  heroEscaped: () => { [330, 370, 415, 494].forEach((f, i) => tone(f, 0.14, 'triangle', 0.18, undefined, i * 0.07)); },
};

function sfxForEvent(event: string) {
  if (event.includes('Spike')) SFX.spike();
  else if (event.includes('Fire')) SFX.fire();
  else if (event.includes('Blade')) SFX.blade();
  else if (event.includes('Poison Pool') || event.includes('Acid')) {
    if (event.includes('Acid')) SFX.acid(); else SFX.poison();
  }
  else if (event.includes('Poison')) SFX.poisonTick();
  else if (event.includes('Crusher')) SFX.crusher();
  else if (event.includes('Void')) SFX.void_();
  else if (event.includes('Lava')) SFX.lava();
  else if (event.includes('Temporal')) SFX.temporal();
  else if (event.includes('Ranged')) SFX.ranged();
  else SFX.combat();
}

const SAVE_KEY = 'dungeon-architect-v1';

interface SaveData {
  levelIdx: number;
  coins: number;
  purchases: Record<string, number>;
  totalScore: number;
}

function loadSave(): SaveData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveData) : null;
  } catch { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

const CELL_PX = 58;

export function DungeonArchitect({ onExit, paused }: { onExit: () => void; paused: boolean }) {
  const [save] = useState(loadSave);
  const [levelIdx, setLevelIdx] = useState(save?.levelIdx ?? 0);
  const [grid, setGrid] = useState<Grid>(makeGrid);
  const [phase, setPhase] = useState<'build' | 'running' | 'result'>('build');
  const [selected, setSelected] = useState<ItemDef | null>(null);
  const [simSteps, setSimSteps] = useState<SimStep[]>([]);
  const [simIdx, setSimIdx] = useState(0);
  const [totalScore, setTotalScore] = useState(save?.totalScore ?? 0);
  const [heroDied, setHeroDied] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(true);
  const [pendingUnlocks, setPendingUnlocks] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [coins, setCoins] = useState(save?.coins ?? 0);
  const [coinsThisLevel, setCoinsThisLevel] = useState(0);
  const [purchases, setPurchases] = useState<Record<string, number>>(save?.purchases ?? {});
  const [showShop, setShowShop] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ levelIdx, coins, purchases, totalScore }));
    } catch { /* ignore */ }
  }, [levelIdx, coins, purchases, totalScore]);

  const cfg = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];

  const unlockedIds = useMemo(() => {
    const ids = new Set<string>(['blockade']);
    for (let i = 0; i <= levelIdx; i++) LEVELS[i]?.newUnlocks.forEach(id => ids.add(id));
    return ids;
  }, [levelIdx]);

  const allItems: ItemDef[] = [BLOCKADE, ...TRAPS, ...MONSTERS];

  const { traps: effectiveTraps, monsters: effectiveMonsters, extraBudget, extraWalls } = useMemo(
    () => computeEffectiveStats(purchases),
    [purchases]
  );

  const effectiveWallLimit = cfg.wallLimit + extraWalls;
  const effectiveBudget = cfg.budget + extraBudget;

  const { budgetSpent, wallsPlaced } = useMemo(() => {
    let b = 0, w = 0;
    for (const cell of grid.flat()) {
      if (cell.type === 'trap') b += TRAPS.find(t => t.id === cell.itemId)?.cost ?? 0;
      else if (cell.type === 'monster') b += MONSTERS.find(m => m.id === cell.itemId)?.cost ?? 0;
      else if (cell.type === 'blockade') w++;
    }
    return { budgetSpent: b, wallsPlaced: w };
  }, [grid]);

  const budgetLeft = effectiveBudget - budgetSpent;

  const previewPath = useMemo(() => {
    if (phase !== 'build' || !showPath) return null;
    return findPath(grid, cfg.heroAtk, cfg.heroArmor, effectiveTraps, effectiveMonsters);
  }, [grid, phase, showPath, cfg, effectiveTraps, effectiveMonsters]);

  const pathSet = useMemo(() =>
    new Set((previewPath ?? []).map(([r, c]) => `${r},${c}`)),
    [previewPath]
  );

  const pathEstimatedDamage = useMemo(() => {
    if (!previewPath) return null;
    const raw = previewPath.reduce((sum, [r, c]) => {
      const cell = grid[r][c];
      if (cell.type === 'trap') {
        const t = effectiveTraps.find(x => x.id === cell.itemId);
        if (!t) return sum;
        let d = t.damage;
        if (t.poisonTicks && t.poisonDmg) d += t.poisonTicks * t.poisonDmg;
        return sum + d;
      }
      if (cell.type === 'monster') {
        const m = effectiveMonsters.find(x => x.id === cell.itemId);
        if (!m) return sum;
        const rounds = Math.ceil(m.hp / cfg.heroAtk);
        let d = rounds * m.atk;
        if (m.ranged) d = Math.round(d * 1.3);
        return sum + d;
      }
      return sum;
    }, 0);
    return Math.round(raw * (1 - cfg.heroArmor / 100));
  }, [previewPath, grid, effectiveTraps, effectiveMonsters, cfg]);

  useEffect(() => {
    if (phase !== 'running') return;
    if (paused) return;
    if (simIdx >= simSteps.length) {
      const last = simSteps[simSteps.length - 1];
      const died = !last || last.hp <= 0;
      setHeroDied(died);
      if (died) SFX.heroSlain(); else SFX.heroEscaped();
      const dmgDealt = cfg.heroHP - (last?.hp ?? cfg.heroHP);
      const pct = Math.min(100, Math.round((dmgDealt / cfg.heroHP) * 100));
      const levelScore = pct * 3 + (died ? 500 : 0);
      setTotalScore(s => s + levelScore);
      const earned = Math.round(60 + dmgDealt * 1.8 + (died ? 220 : 0));
      setCoins(c => c + earned);
      setCoinsThisLevel(earned);
      setPhase('result');
      return;
    }
    const step = simSteps[simIdx];
    if (step.event) sfxForEvent(step.event);
    const delay = step.event ? 380 : 130;
    const t = setTimeout(() => setSimIdx(i => i + 1), delay);
    return () => clearTimeout(t);
  }, [phase, simIdx, simSteps, cfg.heroHP, paused]);

  const heroStep = simIdx > 0 ? simSteps[Math.min(simIdx - 1, simSteps.length - 1)] : null;

  const handleCell = (r: number, c: number) => {
    if (phase !== 'build') return;
    const cell = grid[r][c];
    if (cell.type === 'trap' || cell.type === 'monster' || cell.type === 'blockade') {
      SFX.remove();
      setGrid(prev => { const g = prev.map(row => [...row]); g[r][c] = { type: 'empty' }; return g; });
      return;
    }
    if (cell.type !== 'empty' || !selected) return;
    if (selected.kind === 'blockade' && wallsPlaced >= effectiveWallLimit) return;
    if ((selected.kind === 'trap' || selected.kind === 'monster') && budgetLeft < selected.cost) return;
    SFX.place();
    setGrid(prev => {
      const g = prev.map(row => [...row]);
      g[r][c] = selected.kind === 'blockade'
        ? { type: 'blockade' }
        : selected.kind === 'trap'
        ? { type: 'trap', itemId: selected.id }
        : { type: 'monster', itemId: selected.id };
      return g;
    });
  };

  const handleRelease = () => {
    const path = findPath(grid, cfg.heroAtk, cfg.heroArmor, effectiveTraps, effectiveMonsters);
    if (!path) { setPathError('The hero has no path — unblock an exit route first.'); return; }
    SFX.release();
    setPathError(null);
    setSimSteps(simulate(grid, path, cfg, effectiveTraps, effectiveMonsters));
    setSimIdx(0);
    setPhase('running');
  };

  const handleOpenShop = () => setShowShop(true);

  const handleBuyUpgrade = (id: string) => {
    const upg = SHOP_UPGRADES.find(u => u.id === id)!;
    const count = purchases[id] ?? 0;
    if (count >= upg.maxPurchases) return;
    const cost = upgradeCost(id, count);
    if (coins < cost) return;
    SFX.purchase();
    setCoins(c => c - cost);
    setPurchases(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const handleNextLevel = () => {
    setShowShop(false);
    const next = levelIdx + 1;
    if (next >= LEVELS.length) { setGameOver(true); return; }
    const newU = LEVELS[next].newUnlocks;
    if (newU.length > 0) SFX.unlock(); else SFX.nextLevel();
    setLevelIdx(next);
    setGrid(makeGrid());
    setPhase('build');
    setSelected(null);
    setSimSteps([]);
    setSimIdx(0);
    setHeroDied(false);
    setPendingUnlocks(newU);
  };

  const handleRetry = () => {
    setGrid(makeGrid());
    setPhase('build');
    setSelected(null);
    setSimSteps([]);
    setSimIdx(0);
    setHeroDied(false);
  };

  const cellBg = (cell: Cell, onPath: boolean) => {
    if (cell.type === 'wall') return 'bg-[#0a0a0d]';
    if (cell.type === 'entrance') return 'bg-emerald-950';
    if (cell.type === 'exit') return 'bg-sky-950';
    if (cell.type === 'blockade') return 'bg-[#1a1020] border border-[#3a1850]';
    if (cell.type === 'trap') return 'bg-[#1f0a0a] border border-[#5a1a1a]';
    if (cell.type === 'monster') return 'bg-[#120a1f] border border-[#3a1a5a]';
    if (onPath) return 'bg-[#0d1a28]';
    return 'bg-[#0f0f14]';
  };

  const cellEmoji = (cell: Cell) => {
    if (cell.type === 'entrance') return <span className="text-emerald-400 text-xs font-bold">IN</span>;
    if (cell.type === 'exit') return <span className="text-sky-400 text-xs font-bold">OUT</span>;
    if (cell.type === 'blockade') return <span className="text-[11px]">🧱</span>;
    if (cell.type === 'trap') return <span className="text-base">{TRAPS.find(t => t.id === cell.itemId)?.emoji}</span>;
    if (cell.type === 'monster') return <span className="text-base">{MONSTERS.find(m => m.id === cell.itemId)?.emoji}</span>;
    return null;
  };

  const canAfford = (item: ItemDef) => {
    if (item.kind === 'blockade') return wallsPlaced < effectiveWallLimit;
    return budgetLeft >= item.cost;
  };

  const heroDisplayHP = heroStep?.hp ?? (phase === 'result' ? (simSteps[simSteps.length - 1]?.hp ?? cfg.heroHP) : cfg.heroHP);
  const hpPct = Math.max(0, (heroDisplayHP / cfg.heroHP) * 100);
  const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444';

  const ExitButton = (
    <button onClick={onExit} className="text-xs px-2 py-1 border border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white transition-colors">
      ← STORE
    </button>
  );

  if (gameOver) {
    return (
      <div className="min-h-full bg-[#0d0d0f] flex items-center justify-center relative">
        <div className="absolute top-4 left-4">{ExitButton}</div>
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-amber-400 text-xs tracking-[0.4em] mb-2">ALL LEVELS COMPLETE</div>
          <div className="text-white text-3xl font-bold mb-1">DUNGEON MASTER</div>
          <div className="text-zinc-400 text-sm mb-1">Final Score: {totalScore.toLocaleString()}</div>
          <div className="text-amber-400 text-sm mb-6">🪙 {coins} coins remaining</div>
          <button onClick={() => { clearSave(); setGameOver(false); setLevelIdx(0); setGrid(makeGrid()); setTotalScore(0); setCoins(0); setPurchases({}); setPhase('build'); }}
            className="bg-amber-500 text-black px-6 py-3 font-bold text-sm hover:bg-amber-400 transition-colors">
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  if (showShop) {
    const categories = [
      { key: 'traps', label: '⚡ TRAP UPGRADES' },
      { key: 'monsters', label: '👾 MONSTER UPGRADES' },
      { key: 'dungeon', label: '🏗️ DUNGEON UPGRADES' },
    ] as const;

    return (
      <div className="min-h-full bg-[#0d0d0f] text-white flex flex-col overflow-auto">
        <div className="bg-[#0a0a10] border-b border-[#222] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {ExitButton}
            <div>
              <div className="text-amber-400 text-xs tracking-[0.3em] mb-1">BETWEEN LEVELS</div>
              <div className="text-white text-xl font-bold">⚗️ THE ARCHITECT'S SHOP</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500 text-xs mb-0.5">YOUR COINS</div>
            <div className="text-amber-400 text-2xl font-bold">🪙 {coins}</div>
            {coinsThisLevel > 0 && <div className="text-green-400 text-xs">+{coinsThisLevel} earned this run</div>}
          </div>
        </div>

        <div className="flex-1 px-6 py-6 max-w-4xl mx-auto w-full">
          {categories.map(({ key, label }) => {
            const items = SHOP_UPGRADES.filter(u => u.category === key);
            const visible = items.filter(u => {
              if (key === 'dungeon') return true;
              return unlockedIds.has(u.effect.target ?? '');
            });
            if (!visible.length) return null;
            return (
              <div key={key} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-[#222]" />
                  <span className="text-[10px] text-amber-400 tracking-widest">{label}</span>
                  <div className="h-px flex-1 bg-[#222]" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {visible.map(upg => {
                    const count = purchases[upg.id] ?? 0;
                    const cost = upgradeCost(upg.id, count);
                    const maxed = count >= upg.maxPurchases;
                    const affordable = coins >= cost && !maxed;
                    return (
                      <div key={upg.id}
                        className={`border p-3 flex flex-col gap-2 ${maxed ? 'border-amber-700/40 bg-amber-950/10' : 'border-[#2a2a38] bg-[#111118]'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{upg.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white">{upg.name}</div>
                            <div className="text-[10px] text-zinc-500">{upg.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="text-[10px] text-zinc-600">{count}/{upg.maxPurchases} owned</div>
                          {maxed ? (
                            <span className="text-[10px] text-amber-600 font-bold">MAXED</span>
                          ) : (
                            <button
                              onClick={() => handleBuyUpgrade(upg.id)}
                              disabled={!affordable}
                              className={`text-[10px] font-bold px-3 py-1 border transition-colors ${
                                affordable
                                  ? 'border-amber-500 text-amber-400 hover:bg-amber-500/10 cursor-pointer'
                                  : 'border-zinc-700 text-zinc-600 cursor-not-allowed'
                              }`}>
                              🪙 {cost}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#222] px-6 py-4 flex items-center justify-between bg-[#0a0a10]">
          <div className="text-zinc-500 text-xs">🪙 {coins} coins remaining</div>
          <button onClick={handleNextLevel}
            className="bg-red-700 text-white px-8 py-3 font-bold text-sm hover:bg-red-600 transition-colors">
            ENTER LEVEL {Math.min(levelIdx + 2, LEVELS.length)} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0d0d0f] text-white flex flex-col select-none">
      {pendingUnlocks.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#111118] border border-[#333] p-8 max-w-sm w-full text-center">
            <div className="text-amber-400 text-xs tracking-[0.3em] mb-3">🔓 NEW UNLOCKS</div>
            <div className="text-white text-xl font-bold mb-5">Level {cfg.level} Tools</div>
            <div className="flex flex-col gap-3 mb-6">
              {pendingUnlocks.map(id => {
                const item = allItems.find(i => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="bg-[#1a1a22] border border-[#333] p-3 text-left flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-zinc-400 text-xs">{item.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setPendingUnlocks([])}
              className="bg-amber-500 text-black px-6 py-2 font-bold text-sm hover:bg-amber-400 transition-colors">
              LET'S GO →
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#111118] border-b border-[#222] px-5 py-2.5 flex items-center gap-5 flex-wrap">
        {ExitButton}
        <span className="font-bold text-base text-white tracking-wide">⚔️ DUNGEON ARCHITECT</span>
        <span className="text-xs text-zinc-500">LEVEL <span className="text-white font-bold">{cfg.level}</span>/{LEVELS.length}</span>
        <span className="text-xs text-zinc-500">BUDGET <span className={`font-bold ${budgetLeft <= 0 ? 'text-red-400' : 'text-amber-400'}`}>{budgetLeft}</span>/{effectiveBudget} pts</span>
        <span className="text-xs text-zinc-500">WALLS <span className={`font-bold ${wallsPlaced >= effectiveWallLimit ? 'text-red-400' : 'text-slate-300'}`}>{wallsPlaced}</span>/{effectiveWallLimit}</span>
        <span className="text-xs text-zinc-500">SCORE <span className="text-white font-bold">{totalScore.toLocaleString()}</span></span>
        <span className="text-xs text-amber-400 font-bold">🪙 {coins}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-600">Hero: {cfg.heroHP} HP · {cfg.heroAtk} atk{cfg.heroArmor > 0 ? ` · ${cfg.heroArmor}% armor` : ''}</span>
          <button onClick={() => setShowPath(p => !p)}
            className={`text-xs px-2 py-1 border transition-colors ${showPath ? 'border-sky-700 text-sky-400' : 'border-zinc-700 text-zinc-500'}`}>
            {showPath ? '👁 PATH ON' : '👁 PATH OFF'}
          </button>
          <button onClick={() => { if (confirm('Reset all progress?')) { clearSave(); setLevelIdx(0); setGrid(makeGrid()); setTotalScore(0); setCoins(0); setPurchases({}); setPhase('build'); setSelected(null); setGameOver(false); } }}
            className="text-xs px-2 py-1 border border-zinc-800 text-zinc-600 hover:border-red-900 hover:text-red-500 transition-colors">
            ↺ RESET
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-auto">
        <div className="w-52 shrink-0 bg-[#0d0d12] border-r border-[#1e1e28] p-3 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Select to Place</div>
          <div className="text-[10px] text-zinc-600 mb-2">Click placed item to remove</div>

          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 mb-0.5">Blockades</div>
          {[BLOCKADE].map(item => {
            const locked = !unlockedIds.has(item.id);
            const affordable = canAfford(item);
            const isSel = selected?.id === item.id;
            return (
              <button key={item.id} onClick={() => { if (!locked) setSelected(isSel ? null : item); }}
                className={`text-left p-2 border rounded transition-all ${locked ? 'opacity-30 cursor-not-allowed border-zinc-800' : isSel ? 'border-amber-500 bg-amber-950/40' : affordable ? 'border-[#2a2a38] bg-[#111118] hover:border-[#3a3a50]' : 'border-red-900/50 opacity-50 cursor-not-allowed'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <div className="text-xs font-semibold text-white">{item.name}</div>
                    <div className="text-[10px] text-amber-400">{wallsPlaced}/{effectiveWallLimit} used</div>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2 mb-0.5">Traps</div>
          {TRAPS.map(item => {
            const locked = !unlockedIds.has(item.id);
            const affordable = canAfford(item);
            const isSel = selected?.id === item.id;
            const eff = effectiveTraps.find(t => t.id === item.id);
            const boosted = eff && eff.damage > item.damage;
            return (
              <button key={item.id} onClick={() => { if (!locked) setSelected(isSel ? null : item); }} title={item.description}
                className={`text-left p-2 border rounded transition-all ${locked ? 'opacity-30 cursor-not-allowed border-zinc-800' : isSel ? 'border-amber-500 bg-amber-950/40' : affordable ? 'border-[#2a2a38] bg-[#111118] hover:border-[#3a3a50]' : 'border-red-900/50 opacity-50 cursor-not-allowed'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <div className="text-xs font-semibold text-white">{locked ? '???' : item.name}</div>
                    <div className={`text-[10px] ${locked ? 'text-zinc-600' : affordable ? 'text-amber-400' : 'text-red-400'}`}>
                      {locked ? `Unlocks L${item.unlockLevel}` : `${item.cost} pt · `}
                      {!locked && boosted ? <span className="text-green-400">{eff!.damage} dmg ↑</span> : !locked ? `${item.damage} dmg` : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2 mb-0.5">Monsters</div>
          {MONSTERS.map(item => {
            const locked = !unlockedIds.has(item.id);
            const affordable = canAfford(item);
            const isSel = selected?.id === item.id;
            const eff = effectiveMonsters.find(m => m.id === item.id);
            const boosted = eff && (eff.hp > item.hp || eff.atk > item.atk);
            return (
              <button key={item.id} onClick={() => { if (!locked) setSelected(isSel ? null : item); }} title={item.description}
                className={`text-left p-2 border rounded transition-all ${locked ? 'opacity-30 cursor-not-allowed border-zinc-800' : isSel ? 'border-amber-500 bg-amber-950/40' : affordable ? 'border-[#2a2a38] bg-[#111118] hover:border-[#3a3a50]' : 'border-red-900/50 opacity-50 cursor-not-allowed'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <div className="text-xs font-semibold text-white">{locked ? '???' : item.name}</div>
                    <div className={`text-[10px] ${locked ? 'text-zinc-600' : affordable ? 'text-violet-400' : 'text-red-400'}`}>
                      {locked ? `Unlocks L${item.unlockLevel}` : `${item.cost} pt · `}
                      {!locked && boosted ? <span className="text-green-400">{eff!.hp}HP · {eff!.atk}atk ↑</span> : !locked ? `${item.hp}HP · ${item.atk}atk` : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col items-center justify-start p-4 gap-4 overflow-auto">
          {(phase === 'running' || phase === 'result') && (
            <div className="w-full max-w-3xl">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">🧙 Hero HP</span>
                <span className="font-bold" style={{ color: hpColor }}>{heroDisplayHP} / {cfg.heroHP}</span>
              </div>
              <div className="h-3 bg-[#1a1a22] rounded overflow-hidden">
                <div className="h-full transition-all duration-200 rounded" style={{ width: `${hpPct}%`, background: hpColor }} />
              </div>
              {heroStep?.event && (
                <div className="text-xs text-amber-300 mt-1 h-4">{heroStep.event}</div>
              )}
            </div>
          )}

          <div className="relative" style={{ width: COLS * CELL_PX, height: ROWS * CELL_PX }}>
            {grid.map((row, r) => row.map((cell, c) => {
              const onPath = pathSet.has(`${r},${c}`);
              const isHeroHere = heroStep?.row === r && heroStep?.col === c && phase === 'running';
              const clickable = phase === 'build' && (cell.type === 'empty' || cell.type === 'trap' || cell.type === 'monster' || cell.type === 'blockade');
              return (
                <div key={`${r},${c}`} onClick={() => handleCell(r, c)}
                  style={{ position: 'absolute', left: c * CELL_PX, top: r * CELL_PX, width: CELL_PX, height: CELL_PX }}
                  className={`flex items-center justify-center border border-[#1a1a22] transition-colors
                    ${cellBg(cell, onPath)}
                    ${clickable ? 'cursor-pointer hover:brightness-150' : ''}
                    ${isHeroHere ? 'ring-2 ring-white ring-inset' : ''}
                    ${onPath && cell.type === 'empty' ? 'ring-1 ring-inset ring-sky-900/60' : ''}
                  `}>
                  {cellEmoji(cell)}
                </div>
              );
            }))}

            {phase === 'running' && heroStep && (
              <div className="absolute flex items-center justify-center pointer-events-none z-10 text-xl"
                style={{ left: heroStep.col * CELL_PX, top: heroStep.row * CELL_PX, width: CELL_PX, height: CELL_PX, transition: 'left 0.12s linear, top 0.12s linear', filter: 'drop-shadow(0 0 8px white)' }}>
                🧙
              </div>
            )}
          </div>

          {phase === 'build' && showPath && (
            <div className="text-xs text-zinc-600 -mt-2">
              {previewPath
                ? `Hero's planned route: ${previewPath.length} tiles · estimated damage: ~${pathEstimatedDamage} dmg vs ${cfg.heroHP} HP`
                : '⚠️ Hero has no path — place fewer walls'}
            </div>
          )}

          {pathError && <div className="text-red-400 text-sm">{pathError}</div>}

          {phase === 'build' && (
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => { setGrid(makeGrid()); setSelected(null); }}
                className="px-4 py-2 border border-zinc-700 text-zinc-400 text-sm font-semibold hover:border-zinc-500 hover:text-white transition-colors">
                ↺ RESET
              </button>
              <button onClick={handleRelease} disabled={!previewPath}
                className="px-6 py-2 bg-red-700 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ▶ RELEASE THE HERO
              </button>
            </div>
          )}

          {phase === 'result' && (
            <div className="bg-[#111118] border border-[#333] p-6 text-center max-w-sm w-full">
              <div className="text-4xl mb-3">{heroDied ? '💀' : '🏃'}</div>
              <div className={`text-xs tracking-[0.3em] mb-1 ${heroDied ? 'text-red-400' : 'text-sky-400'}`}>
                {heroDied ? 'HERO SLAIN' : 'HERO ESCAPED'}
              </div>
              <div className="text-white text-xl font-bold mb-2">
                {heroDied ? 'Dungeon cleared!' : 'Hero made it out...'}
              </div>
              <div className="text-amber-400 text-sm font-bold mb-1">🪙 +{coinsThisLevel} coins earned</div>
              <div className="text-zinc-500 text-xs mb-4">Total: 🪙 {coins} coins</div>
              <div className="flex gap-2 justify-center">
                <button onClick={handleRetry}
                  className="px-4 py-2 border border-zinc-600 text-zinc-300 text-sm font-semibold hover:border-zinc-400 hover:text-white transition-colors">
                  ↺ RETRY
                </button>
                {heroDied && (
                  <button onClick={handleOpenShop}
                    className="px-4 py-2 bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors">
                    ⚗️ SHOP →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
