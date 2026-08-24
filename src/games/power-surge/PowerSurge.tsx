import { useEffect, useRef, useState, useCallback } from 'react';

const W = 480;
const H = 620;

type Enemy = { id: number; x: number; y: number; type: 0 | 1 | 2; hp: number; maxHp: number; vx: number; vy: number; phase: number };
type Bullet = { id: number; x: number; y: number };
type Surge = { id: number; x: number; y: number; speed: number };
type PowerUp = { id: number; x: number; y: number; kind: 'shield' | 'rapid' };

const ENEMY_DATA = [
  { emoji: '👾', color: '#d82800', hp: 1, pts: 10 },
  { emoji: '👻', color: '#aa44ff', hp: 2, pts: 20 },
  { emoji: '🐲', color: '#f8b800', hp: 3, pts: 50 },
];

let _id = 0;
const uid = () => ++_id;

function seededRand(seed: number, n: number) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawSurge(ctx: CanvasRenderingContext2D, surge: Surge, frame: number) {
  const blink = frame % 6 < 3;
  ctx.save();
  ctx.strokeStyle = blink ? '#ffff44' : '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffff00';
  ctx.beginPath();
  const segs = 6;
  const segH = 80 / segs;
  let cx = surge.x + 5;
  ctx.moveTo(cx, surge.y);
  for (let i = 0; i < segs; i++) {
    cx = surge.x + seededRand(surge.id, i) * 16 - 2;
    ctx.lineTo(cx, surge.y + segH * (i + 1));
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, shield: boolean, frame: number) {
  ctx.fillStyle = '#00b800';
  ctx.fillRect(x + 13, y, 6, 14);
  ctx.fillRect(x, y + 7, 32, 7);
  ctx.fillRect(x + 5, y + 4, 22, 10);
  ctx.fillStyle = '#f8b800';
  ctx.fillRect(x + 14, y + 2, 4, 5);
  ctx.fillStyle = frame % 4 < 2 ? '#d82800' : '#f8b800';
  ctx.fillRect(x + 15, y + 14, 3, 5);

  if (shield) {
    ctx.save();
    ctx.strokeStyle = `rgba(68,136,255,${0.6 + 0.4 * Math.sin(frame * 0.2)})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4488ff';
    ctx.beginPath();
    ctx.arc(x + 16, y + 10, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.font = '26px serif';
  ctx.textAlign = 'center';
  ctx.fillText(ENEMY_DATA[e.type].emoji, e.x + 14, e.y + 26);
  ctx.textAlign = 'left';
  if (e.maxHp > 1) {
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x, e.y - 7, 28, 4);
    ctx.fillStyle = ENEMY_DATA[e.type].color;
    ctx.fillRect(e.x, e.y - 7, Math.round(28 * (e.hp / e.maxHp)), 4);
  }
}

function hudText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function PowerSurge({ onExit, paused }: { onExit: () => void; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const s = useRef({
    player: { x: W / 2 - 16, y: H - 68 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    surges: [] as Surge[],
    powerups: [] as PowerUp[],
    score: 0,
    lives: 3,
    level: 1,
    gameOver: false,
    started: false,
    keys: {} as Record<string, boolean>,
    lastShot: 0,
    rapidFire: false,
    rapidUntil: 0,
    shield: false,
    shieldUntil: 0,
    frame: 0,
    spawnTimer: 0,
    surgeTimer: 0,
  });

  const [, setUi] = useState({ score: 0, lives: 3, started: false, gameOver: false });

  const reset = useCallback(() => {
    const g = s.current;
    g.player = { x: W / 2 - 16, y: H - 68 };
    g.bullets = []; g.enemies = []; g.surges = []; g.powerups = [];
    g.score = 0; g.lives = 3; g.level = 1;
    g.gameOver = false; g.started = true;
    g.rapidFire = false; g.shield = false;
    g.frame = 0; g.spawnTimer = 0; g.surgeTimer = 0;
    setUi({ score: 0, lives: 3, started: true, gameOver: false });
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      s.current.keys[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && (!s.current.started || s.current.gameOver)) reset();
    };
    const up = (e: KeyboardEvent) => { s.current.keys[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const shoot = (now: number) => {
      const g = s.current;
      const cd = g.rapidFire ? 100 : 280;
      if (now - g.lastShot > cd) {
        g.bullets.push({ id: uid(), x: g.player.x + 14, y: g.player.y });
        g.lastShot = now;
      }
    };

    const spawnEnemy = () => {
      const g = s.current;
      const maxType = Math.min(2, Math.floor(g.level / 2));
      const type = Math.floor(Math.random() * (maxType + 1)) as 0 | 1 | 2;
      const hp = ENEMY_DATA[type].hp;
      g.enemies.push({
        id: uid(), x: 10 + Math.random() * (W - 50), y: -40,
        type, hp, maxHp: hp,
        vx: (Math.random() * 2 - 1) * (1 + g.level * 0.15),
        vy: 0.6 + Math.random() * 0.4 + g.level * 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    };

    const spawnSurge = () => {
      const g = s.current;
      g.surges.push({ id: uid(), x: 10 + Math.random() * (W - 30), y: -90, speed: 4 + g.level * 0.4 });
    };

    const loop = (time: number) => {
      const g = s.current;
      if (pausedRef.current) {
        raf = requestAnimationFrame(loop);
        return;
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 50; i++) {
        const sx = (Math.sin(i * 137.5) * 1000 + 1000) % W;
        const sy = (i * 71 + g.frame * 0.5) % H;
        ctx.fillRect(sx, sy, 1, 1);
      }

      if (!g.started || g.gameOver) {
        if (g.gameOver) {
          hudText(ctx, 'Game Over', W / 2, H / 2 - 30, 26, '#d82800', 'center');
          hudText(ctx, `Score: ${g.score}`, W / 2, H / 2 + 10, 16, '#f8b800', 'center');
          hudText(ctx, 'Press Space', W / 2, H / 2 + 50, 14, '#fcfcfc', 'center');
          hudText(ctx, 'to play again', W / 2, H / 2 + 70, 14, '#fcfcfc', 'center');
        } else {
          hudText(ctx, 'Power Surge', W / 2, H / 2 - 70, 30, '#f8b800', 'center');
          hudText(ctx, 'Dodge the bolts', W / 2, H / 2 - 25, 14, '#fcfcfc', 'center');
          hudText(ctx, 'Shoot the enemies', W / 2, H / 2, 14, '#fcfcfc', 'center');
          hudText(ctx, '← → move', W / 2, H / 2 + 50, 13, '#bcbcbc', 'center');
          hudText(ctx, 'Space / ↑ shoot', W / 2, H / 2 + 70, 13, '#bcbcbc', 'center');
          hudText(ctx, 'Press space to start', W / 2, H / 2 + 120, 13, '#00b800', 'center');
        }
        raf = requestAnimationFrame(loop);
        return;
      }

      g.frame++;

      if (g.rapidFire && time > g.rapidUntil) g.rapidFire = false;
      if (g.shield && time > g.shieldUntil) g.shield = false;

      if (g.keys['ArrowLeft']) g.player.x = Math.max(0, g.player.x - 4);
      if (g.keys['ArrowRight']) g.player.x = Math.min(W - 32, g.player.x + 4);
      if (g.keys['Space'] || g.keys['ArrowUp']) shoot(time);

      g.spawnTimer++;
      if (g.spawnTimer > Math.max(35, 90 - g.level * 5)) { spawnEnemy(); g.spawnTimer = 0; }
      g.surgeTimer++;
      if (g.surgeTimer > Math.max(50, 130 - g.level * 7)) { spawnSurge(); g.surgeTimer = 0; }

      if (g.score >= g.level * 300) g.level++;

      g.bullets = g.bullets.filter(b => b.y > -14);
      g.bullets.forEach(b => b.y -= 9);

      g.enemies.forEach(e => {
        e.phase += 0.04;
        if (e.type === 0) {
          e.x += Math.sin(e.phase) * 1.8;
          e.y += e.vy;
        } else if (e.type === 1) {
          e.x += Math.sin(e.phase * 1.4) * 2.5;
          e.y += e.vy + Math.cos(e.phase) * 0.4;
        } else {
          const dx = g.player.x - e.x;
          e.x += dx * 0.018;
          e.y += e.vy + 0.3;
        }
        if (e.x < 0) e.x = 0;
        if (e.x > W - 28) e.x = W - 28;
      });
      g.enemies = g.enemies.filter(e => e.y < H + 50);

      g.surges = g.surges.filter(sg => sg.y < H + 100);
      g.surges.forEach(sg => sg.y += sg.speed);

      g.powerups = g.powerups.filter(p => p.y < H + 20);
      g.powerups.forEach(p => p.y += 1.5);

      const deadBullets = new Set<number>();
      const deadEnemies = new Set<number>();
      for (const b of g.bullets) {
        for (const e of g.enemies) {
          if (b.x > e.x - 4 && b.x < e.x + 28 && b.y > e.y && b.y < e.y + 30) {
            deadBullets.add(b.id);
            e.hp--;
            if (e.hp <= 0) {
              deadEnemies.add(e.id);
              g.score += ENEMY_DATA[e.type].pts * g.level;
              if (Math.random() < 0.18) {
                g.powerups.push({ id: uid(), x: e.x + 4, y: e.y, kind: Math.random() < 0.5 ? 'shield' : 'rapid' });
              }
            }
          }
        }
      }
      g.bullets = g.bullets.filter(b => !deadBullets.has(b.id));
      g.enemies = g.enemies.filter(e => !deadEnemies.has(e.id));

      if (!g.shield) {
        const px = g.player.x, py = g.player.y;
        for (const sg of [...g.surges]) {
          if (sg.x - 4 < px + 32 && sg.x + 14 > px && sg.y < py + 20 && sg.y + 80 > py) {
            g.surges = g.surges.filter(x => x.id !== sg.id);
            g.lives--;
            g.player.x = W / 2 - 16;
            if (g.lives <= 0) { g.gameOver = true; setUi(u => ({ ...u, lives: 0, gameOver: true })); }
            else setUi(u => ({ ...u, lives: g.lives }));
          }
        }
      }

      if (!g.shield) {
        const px = g.player.x, py = g.player.y;
        for (const e of [...g.enemies]) {
          if (e.x < px + 30 && e.x + 26 > px + 2 && e.y < py + 18 && e.y + 26 > py + 2) {
            g.enemies = g.enemies.filter(x => x.id !== e.id);
            g.lives--;
            if (g.lives <= 0) { g.gameOver = true; setUi(u => ({ ...u, lives: 0, gameOver: true })); }
            else setUi(u => ({ ...u, lives: g.lives }));
          }
        }
      }

      const px2 = g.player.x, py2 = g.player.y;
      for (const p of [...g.powerups]) {
        if (p.x < px2 + 32 && p.x + 20 > px2 && p.y < py2 + 20 && p.y + 20 > py2) {
          g.powerups = g.powerups.filter(x => x.id !== p.id);
          if (p.kind === 'shield') { g.shield = true; g.shieldUntil = time + 5000; }
          else { g.rapidFire = true; g.rapidUntil = time + 5000; }
        }
      }

      setUi(u => ({ ...u, score: g.score }));

      g.powerups.forEach(p => {
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.kind === 'shield' ? '🛡' : '⚡', p.x + 10, p.y + 18);
        ctx.textAlign = 'left';
      });

      g.surges.forEach(sg => drawSurge(ctx, sg, g.frame));
      g.enemies.forEach(e => drawEnemy(ctx, e));

      ctx.fillStyle = '#44ff44';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00ff00';
      g.bullets.forEach(b => ctx.fillRect(b.x - 1, b.y, 4, 12));
      ctx.shadowBlur = 0;

      drawPlayer(ctx, g.player.x, g.player.y, g.shield, g.frame);

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, 34);
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 34, W, 2);
      hudText(ctx, `${g.score}`, 10, 23, 14, '#f8b800');
      hudText(ctx, `Lvl ${g.level}`, W / 2, 23, 14, '#00b800', 'center');
      for (let i = 0; i < g.lives; i++) {
        ctx.font = '16px serif';
        ctx.fillText('♥', W - 20 - i * 22, 24);
      }
      let indX = 10;
      if (g.rapidFire) { hudText(ctx, '⚡ Rapid', indX, H - 8, 11, '#f8b800'); indX += 80; }
      if (g.shield) { hudText(ctx, '🛡 Shield', indX, H - 8, 11, '#4488ff'); }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-6 px-4 overflow-y-auto bg-black" style={{ minHeight: '100%' }}>
      <button
        onClick={onExit}
        className="self-start rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/40 hover:text-white"
      >
        ← Store
      </button>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg border border-white/10"
        style={{ display: 'block', maxWidth: '100%', cursor: 'none' }}
        tabIndex={0}
        onClick={() => { if (!s.current.started || s.current.gameOver) reset(); }}
      />
      <div className="flex gap-6 text-xs text-white/40">
        <span>← → Move</span>
        <span>Space / ↑ Shoot</span>
        <span>Click to start</span>
      </div>
    </div>
  );
}
