import { useState, useEffect, useCallback, useRef } from 'react';
import { playClick, playBuild, playPowerup } from '../../lib/sounds';

interface Building { id: string; name: string; icon: string; count: number; baseCost: number; baseCps: number; color: string }
interface Upgrade { id: string; name: string; desc: string; cost: number; mult: number; bought: boolean }
interface Floater { id: number; x: number; y: number; val: number; ts: number }

const BASE_BUILDINGS: Omit<Building, 'count'>[] = [
  { id: 'gameboy', name: 'Game Boy', icon: '🎮', baseCost: 15, baseCps: 0.1, color: '#888888' },
  { id: 'nes', name: 'NES', icon: '🕹', baseCost: 100, baseCps: 0.5, color: '#d82800' },
  { id: 'snes', name: 'SNES', icon: '🟣', baseCost: 1_100, baseCps: 4, color: '#aa44ff' },
  { id: 'n64', name: 'Nintendo 64', icon: '🔴', baseCost: 12_000, baseCps: 10, color: '#00b800' },
  { id: 'ps1', name: 'PlayStation', icon: '💿', baseCost: 130_000, baseCps: 40, color: '#4488ff' },
  { id: 'gamecube', name: 'GameCube', icon: '⬛', baseCost: 1_400_000, baseCps: 100, color: '#8844ff' },
  { id: 'xbox360', name: 'Xbox 360', icon: '⭕', baseCost: 20_000_000, baseCps: 400, color: '#00b800' },
  { id: 'ps3', name: 'PS3', icon: '🔵', baseCost: 330_000_000, baseCps: 6_666, color: '#0055cc' },
  { id: 'ps4', name: 'PS4', icon: '🎯', baseCost: 5_100_000_000, baseCps: 50_000, color: '#003399' },
  { id: 'ps5', name: 'PS5', icon: '⬜', baseCost: 75_000_000_000, baseCps: 1_000_000, color: '#fcfcfc' },
];

const BASE_UPGRADES: Upgrade[] = [
  { id: 'u1', name: 'Turbo Button', desc: '2× credits per click', cost: 100, mult: 2, bought: false },
  { id: 'u2', name: 'Rapid Fire', desc: '2× credits per click', cost: 500, mult: 2, bought: false },
  { id: 'u3', name: 'Gold Controller', desc: '5× credits per click', cost: 10_000, mult: 5, bought: false },
  { id: 'u4', name: 'Pro Gamer', desc: '10× credits per click', cost: 100_000, mult: 10, bought: false },
  { id: 'u5', name: 'Speedrun Mode', desc: '25× credits per click', cost: 1_000_000, mult: 25, bought: false },
  { id: 'u6', name: 'No-Clip Hack', desc: '50× credits per click', cost: 1_000_000_000, mult: 50, bought: false },
];

function fmt(n: number): string {
  if (n < 1e3) return Math.floor(n).toLocaleString();
  if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(1) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(1) + 'B';
  if (n < 1e15) return (n / 1e12).toFixed(1) + 'T';
  return (n / 1e15).toFixed(1) + 'Q';
}

function nextCost(b: Building, qty: number = 1): number {
  let total = 0;
  for (let i = 0; i < qty; i++) total += Math.ceil(b.baseCost * Math.pow(1.15, b.count + i));
  return total;
}

function totalCps(buildings: Building[]): number {
  return buildings.reduce((s, b) => s + b.baseCps * b.count, 0);
}

const SAVE_KEY = 'console-clicker-v1';

function loadSave(): { credits: number; buildings: Building[]; upgrades: Upgrade[] } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let _fid = 0;

export function ConsoleClicker({ onExit, paused }: { onExit: () => void; paused: boolean }) {
  const [credits, setCredits] = useState(0);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const [buildings, setBuildings] = useState<Building[]>(() => BASE_BUILDINGS.map((b) => ({ ...b, count: 0 })));
  const [upgrades, setUpgrades] = useState<Upgrade[]>(BASE_UPGRADES);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [clicking, setClicking] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);

  const creditsRef = useRef(0);
  const buildingsRef = useRef(buildings);
  const upgradesRef = useRef(upgrades);
  const totalRef = useRef(0);

  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { upgradesRef.current = upgrades; }, [upgrades]);

  useEffect(() => {
    const save = loadSave();
    if (!save) return;
    creditsRef.current = save.credits;
    setCredits(save.credits);
    totalRef.current = save.credits;
    setTotalEarned(save.credits);
    setBuildings(save.buildings);
    setUpgrades(save.upgrades);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        credits: creditsRef.current,
        buildings: buildingsRef.current,
        upgrades: upgradesRef.current,
      }));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const cps = totalCps(buildingsRef.current);
      const gain = cps / 20;
      creditsRef.current += gain;
      totalRef.current += gain;
      setCredits((c) => c + gain);
      setTotalEarned((t) => t + gain);
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setFloaters((f) => f.filter((x) => Date.now() - x.ts < 900));
    }, 200);
    return () => clearInterval(id);
  }, []);

  const clickMult = upgrades.filter((u) => u.bought).reduce((m, u) => m * u.mult, 1);
  const cps = totalCps(buildings);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const gain = clickMult;
    creditsRef.current += gain;
    totalRef.current += gain;
    setCredits((c) => c + gain);
    setTotalEarned((t) => t + gain);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++_fid;
    setFloaters((f) => [...f, { id, x, y, val: gain, ts: Date.now() }]);

    setClicking(true);
    setTimeout(() => setClicking(false), 80);
    playClick();
  }, [clickMult]);

  const buyBuilding = useCallback((idx: number, qty: number = 1) => {
    setBuildings((prev) => {
      const b = prev[idx];
      const cost = nextCost(b, qty);
      if (creditsRef.current < cost) return prev;
      creditsRef.current -= cost;
      setCredits(creditsRef.current);
      const next = prev.map((x, i) => (i === idx ? { ...x, count: x.count + qty } : x));
      buildingsRef.current = next;
      playBuild();
      return next;
    });
  }, []);

  const buyUpgrade = useCallback((uid: string) => {
    setUpgrades((prev) => {
      const u = prev.find((x) => x.id === uid);
      if (!u || u.bought || creditsRef.current < u.cost) return prev;
      creditsRef.current -= u.cost;
      setCredits(creditsRef.current);
      const next = prev.map((x) => (x.id === uid ? { ...x, bought: true } : x));
      upgradesRef.current = next;
      playPowerup();
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    if (!confirm('Reset all progress?')) return;
    creditsRef.current = 0;
    totalRef.current = 0;
    const fresh = BASE_BUILDINGS.map((b) => ({ ...b, count: 0 }));
    buildingsRef.current = fresh;
    upgradesRef.current = BASE_UPGRADES;
    setCredits(0);
    setTotalEarned(0);
    setBuildings(fresh);
    setUpgrades(BASE_UPGRADES);
    localStorage.removeItem(SAVE_KEY);
  }, []);

  const availableUpgrades = upgrades.filter((u) => !u.bought && totalEarned >= u.cost * 0.5);

  const HL = '#f8b800';

  return (
    <div className="overflow-y-auto bg-black" style={{ minHeight: '100%', padding: '24px 16px' }}>
      <div className="mx-auto" style={{ width: '100%', maxWidth: 900 }}>
        <button
          onClick={onExit}
          className="mb-4 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/40 hover:text-white"
        >
          ← Store
        </button>

        <div className="mb-4 text-center">
          <p className="mb-1 text-3xl font-bold" style={{ color: HL }}>{fmt(credits)}</p>
          <p className="text-sm text-white/50">Credits</p>
          <p className="mt-1 text-xs text-white/30">
            {fmt(cps)}/sec &nbsp;·&nbsp; {fmt(clickMult)}/click
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex flex-col items-center gap-3" style={{ minWidth: 200 }}>
            <div className="relative" style={{ width: 180, height: 180 }}>
              <button
                onClick={handleClick}
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl"
                style={{
                  background: '#0a0a0a', border: `2px solid ${HL}`,
                  transform: clicking ? 'scale(0.93)' : 'scale(1)', transition: 'transform 0.06s',
                  boxShadow: clicking ? `0 0 20px ${HL}` : '0 0 8px #333',
                }}
              >
                <div style={{ fontSize: 64, lineHeight: 1, filter: clicking ? 'brightness(1.4)' : 'brightness(1)' }}>🎮</div>
                <p className="text-sm font-semibold" style={{ color: HL }}>Click!</p>
              </button>

              {floaters.map((f) => (
                <div
                  key={f.id}
                  className="pointer-events-none absolute text-sm font-semibold whitespace-nowrap"
                  style={{ left: f.x, top: f.y, color: HL, animation: 'floatUp 0.9s ease-out forwards' }}
                >
                  +{fmt(f.val)}
                </div>
              ))}
            </div>

            <div className="w-full rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs font-semibold text-white/50">Upgrades</p>
              </div>
              {availableUpgrades.length === 0 ? (
                <p className="px-3 py-3 text-xs text-white/30">Earn more to unlock</p>
              ) : (
                availableUpgrades.map((u) => {
                  const canBuy = credits >= u.cost;
                  return (
                    <button
                      key={u.id}
                      onClick={() => buyUpgrade(u.id)}
                      disabled={!canBuy}
                      className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left"
                      style={{
                        background: canBuy ? 'rgba(255,255,255,0.04)' : 'transparent',
                        cursor: canBuy ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <div className="flex-1">
                        <p className={`text-sm ${canBuy ? 'text-white' : 'text-white/30'}`}>{u.name}</p>
                        <p className="text-xs text-white/40">{u.desc}</p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-medium" style={{ color: canBuy ? HL : 'rgba(255,255,255,0.3)' }}>{fmt(u.cost)}</p>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={resetGame}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:border-white/30 hover:text-white/70"
            >
              Reset
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden" style={{ flex: 1, minWidth: 260 }}>
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs font-semibold text-white/50">Hardware</p>
              <p className="text-xs text-white/50">{fmt(cps)}/sec</p>
            </div>

            {buildings.map((b, i) => {
              const cost1 = nextCost(b, 1);
              const cost10 = nextCost(b, 10);
              const can1 = credits >= cost1;
              const can10 = credits >= cost10;
              const cpsEach = b.baseCps;
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 border-b border-white/5 px-3 py-2"
                  style={{
                    background: b.count > 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                    opacity: b.count === 0 && !can1 && totalEarned < b.baseCost * 0.5 ? 0.3 : 1,
                  }}
                >
                  <span className="text-xl" style={{ minWidth: 28, textAlign: 'center' }}>{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${b.count > 0 ? 'text-white' : 'text-white/40'}`}>{b.name}</p>
                    <p className="text-xs text-white/30">
                      {fmt(cpsEach)}/sec each{b.count > 0 ? ` · total: ${fmt(cpsEach * b.count)}/sec` : ''}
                    </p>
                  </div>
                  <div className="rounded px-1.5 py-0.5 text-center text-xs font-semibold" style={{ minWidth: 28, background: b.count > 0 ? b.color : 'rgba(255,255,255,0.08)', color: b.count > 0 ? '#000' : 'rgba(255,255,255,0.3)' }}>
                    {b.count}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => buyBuilding(i, 1)}
                      disabled={!can1}
                      className="whitespace-nowrap rounded px-2 py-1 text-xs font-medium"
                      style={{
                        background: can1 ? b.color : 'rgba(255,255,255,0.05)',
                        color: can1 ? '#000' : 'rgba(255,255,255,0.3)',
                        cursor: can1 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {fmt(cost1)}
                    </button>
                    <button
                      onClick={() => buyBuilding(i, 10)}
                      disabled={!can10}
                      className="whitespace-nowrap rounded border px-2 py-1 text-xs font-medium"
                      style={{
                        background: can10 ? 'rgba(255,255,255,0.06)' : 'transparent',
                        borderColor: can10 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                        color: can10 ? HL : 'rgba(255,255,255,0.3)',
                        cursor: can10 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      ×10 {fmt(cost10)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0)   scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.7); }
        }
      `}</style>
    </div>
  );
}
