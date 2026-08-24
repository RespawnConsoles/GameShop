import { useState, useEffect, useCallback, useRef } from 'react';

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

export function ConsoleClicker({ onExit }: { onExit: () => void }) {
  const [credits, setCredits] = useState(0);
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
    <div className="retro-game overflow-y-auto" style={{ minHeight: '100%', background: '#000', padding: '24px 16px', fontFamily: 'var(--font-nes), monospace' }}>
      <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
        <button
          onClick={onExit}
          className="border-2 border-white/40 text-white/70 hover:text-white hover:border-white px-3 py-1.5 text-[9px] mb-4"
        >
          ← STORE
        </button>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 20, color: HL, marginBottom: 4 }}>{fmt(credits)}</p>
          <p style={{ fontSize: 8, color: '#bcbcbc' }}>CREDITS</p>
          <p style={{ fontSize: 7, color: '#555', marginTop: 4 }}>
            {fmt(cps)}/SEC &nbsp;·&nbsp; {fmt(clickMult)}/CLICK
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 200 }}>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <button
                onClick={handleClick}
                style={{
                  width: '100%', height: '100%', background: '#0a0a0a', border: `4px solid ${HL}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 6,
                  transform: clicking ? 'scale(0.93)' : 'scale(1)', transition: 'transform 0.06s',
                  boxShadow: clicking ? `0 0 20px ${HL}` : '0 0 8px #333',
                }}
              >
                <div style={{ fontSize: 64, lineHeight: 1, filter: clicking ? 'brightness(1.4)' : 'brightness(1)' }}>🎮</div>
                <p style={{ fontSize: 7, color: HL, margin: 0 }}>CLICK!</p>
              </button>

              {floaters.map((f) => (
                <div
                  key={f.id}
                  style={{
                    position: 'absolute', left: f.x, top: f.y, color: HL, fontSize: 9,
                    fontFamily: 'var(--font-nes), monospace', pointerEvents: 'none',
                    animation: 'floatUp 0.9s ease-out forwards', whiteSpace: 'nowrap',
                  }}
                >
                  +{fmt(f.val)}
                </div>
              ))}
            </div>

            <div style={{ width: '100%', border: '3px solid #222', background: '#0a0a0a' }}>
              <div style={{ background: '#111', borderBottom: '3px solid #222', padding: '6px 10px' }}>
                <p style={{ fontSize: 7, color: '#555' }}>UPGRADES</p>
              </div>
              {availableUpgrades.length === 0 ? (
                <p style={{ fontSize: 6, color: '#333', padding: '8px 10px' }}>EARN MORE TO UNLOCK</p>
              ) : (
                availableUpgrades.map((u) => {
                  const canBuy = credits >= u.cost;
                  return (
                    <button
                      key={u.id}
                      onClick={() => buyUpgrade(u.id)}
                      disabled={!canBuy}
                      style={{
                        display: 'flex', width: '100%', padding: '6px 10px',
                        background: canBuy ? '#111' : '#0a0a0a', border: 'none',
                        borderBottom: '2px solid #1a1a1a', cursor: canBuy ? 'pointer' : 'not-allowed',
                        textAlign: 'left', gap: 8, alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 7, color: canBuy ? '#fcfcfc' : '#444', margin: 0 }}>{u.name}</p>
                        <p style={{ fontSize: 6, color: '#555', margin: 0 }}>{u.desc}</p>
                      </div>
                      <p style={{ fontSize: 7, color: canBuy ? HL : '#444', margin: 0, whiteSpace: 'nowrap' }}>{fmt(u.cost)}</p>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={resetGame}
              style={{ fontSize: 6, color: '#333', background: 'none', border: '2px solid #222', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-nes), monospace' }}
            >
              RESET
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 260, border: '3px solid #222', background: '#0a0a0a' }}>
            <div style={{ background: '#111', borderBottom: '3px solid #222', padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 7, color: '#555' }}>HARDWARE</p>
              <p style={{ fontSize: 7, color: '#555' }}>{fmt(cps)}/SEC</p>
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
                  style={{
                    display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '2px solid #111',
                    background: b.count > 0 ? '#0d0d0d' : '#0a0a0a', gap: 10,
                    opacity: b.count === 0 && !can1 && totalEarned < b.baseCost * 0.5 ? 0.3 : 1,
                  }}
                >
                  <span style={{ fontSize: 20, minWidth: 28, textAlign: 'center' }}>{b.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 7, color: b.count > 0 ? '#fcfcfc' : '#555', margin: 0 }}>{b.name}</p>
                    <p style={{ fontSize: 6, color: '#444', margin: 0 }}>
                      {fmt(cpsEach)}/sec each{b.count > 0 ? ` · total: ${fmt(cpsEach * b.count)}/sec` : ''}
                    </p>
                  </div>
                  <div style={{ minWidth: 28, textAlign: 'center', background: b.count > 0 ? b.color : '#1a1a1a', padding: '2px 4px' }}>
                    <p style={{ fontSize: 8, color: b.count > 0 ? '#000' : '#333', margin: 0 }}>{b.count}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <button
                      onClick={() => buyBuilding(i, 1)}
                      disabled={!can1}
                      style={{
                        fontSize: 6, padding: '3px 6px', background: can1 ? b.color : '#111',
                        color: can1 ? '#000' : '#333', border: `2px solid ${can1 ? b.color : '#222'}`,
                        cursor: can1 ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-nes), monospace', whiteSpace: 'nowrap',
                      }}
                    >
                      {fmt(cost1)}
                    </button>
                    <button
                      onClick={() => buyBuilding(i, 10)}
                      disabled={!can10}
                      style={{
                        fontSize: 6, padding: '3px 6px', background: can10 ? '#222' : '#0a0a0a',
                        color: can10 ? HL : '#333', border: `2px solid ${can10 ? '#444' : '#1a1a1a'}`,
                        cursor: can10 ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-nes), monospace', whiteSpace: 'nowrap',
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
