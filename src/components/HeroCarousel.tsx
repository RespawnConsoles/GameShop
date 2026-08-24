import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogGame } from '../lib/catalog';

interface HeroCarouselProps {
  games: CatalogGame[];
  onOpen: (game: CatalogGame) => void;
}

const AUTO_ADVANCE_MS = 6000;

export function HeroCarousel({ games, onOpen }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || games.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % games.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, games.length]);

  if (games.length === 0) return null;
  const game = games[index];

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + games.length) % games.length);

  return (
    <div
      className="relative mb-10 w-full overflow-hidden rounded-xl border border-white/10"
      style={{ height: 380 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={game.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(120deg, ${game.color}33 0%, #0e0f13 70%)` }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, ${game.color}22 0%, transparent 55%)`,
            }}
          />

          <div className="relative z-10 flex h-full items-center gap-10 px-10 sm:px-14">
            <div className="max-w-lg">
              <span className="mb-3 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/70">
                {game.group}
              </span>
              <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">{game.title}</h1>
              <p className="mb-1 text-sm text-white/50">{game.genre} · {game.maker}</p>
              <p className="mb-6 max-w-md text-sm leading-relaxed text-white/60">{game.description}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onOpen(game)}
                  className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  View Game
                </button>
                <span className="text-lg font-semibold text-emerald-400">
                  {game.price === 0 ? 'FREE' : `$${game.price.toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="hidden flex-1 items-center justify-center md:flex">
              <img
                src={game.image}
                alt=""
                className="max-h-64 max-w-md object-contain"
                style={{ filter: `drop-shadow(0 20px 45px ${game.color}55)` }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => go(-1)}
        aria-label="Previous"
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur transition hover:bg-black/60 hover:text-white"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next"
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur transition hover:bg-black/60 hover:text-white"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2">
        {games.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setIndex(i)}
            aria-label={`Show ${g.title}`}
            className="h-8 w-14 overflow-hidden rounded border-2 transition"
            style={{ borderColor: i === index ? '#34d399' : 'rgba(255,255,255,0.15)' }}
          >
            <img src={g.image} alt="" className="h-full w-full object-cover" style={{ opacity: i === index ? 1 : 0.5 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
