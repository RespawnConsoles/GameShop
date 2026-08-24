import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FACES: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = FACES[value] || FACES[6];
  return (
    <motion.div
      className="relative rounded-lg border-2 shadow-lg"
      style={{ width: 44, height: 44, background: "#f5f0e8", borderColor: "#f8b800" }}
      animate={rolling
        ? { rotate: [0, -15, 15, -10, 10, -5, 5, 0], scale: [1, 1.15, 0.95, 1.1, 0.98, 1] }
        : { rotate: 0, scale: 1 }
      }
      transition={rolling
        ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
        : { duration: 0.3, ease: "backOut" }
      }
    >
      {dots.map(([cx, cy], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 7, height: 7,
            background: "#c2410c",
            left: `calc(${cx}% - 3.5px)`,
            top: `calc(${cy}% - 3.5px)`,
          }}
        />
      ))}
    </motion.div>
  );
}

interface DiceRollerProps {
  onRoll: (d1: number, d2: number) => void;
  lastRoll: number | null;
  disabled: boolean;
}

export default function DiceRoller({ onRoll, lastRoll, disabled }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [rollingFaces, setRollingFaces] = useState<[number, number]>([1, 1]);
  const [finalFaces, setFinalFaces] = useState<[number, number] | null>(null);

  const roll = () => {
    if (rolling || disabled) return;
    setRolling(true);
    setFinalFaces(null);
    let ticks = 0;
    const interval = setInterval(() => {
      setRollingFaces([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      ticks++;
      if (ticks >= 12) {
        clearInterval(interval);
        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        setFinalFaces([d1, d2]);
        setRolling(false);
        onRoll(d1, d2);
      }
    }, 80);
  };

  const d1show = rolling ? rollingFaces[0] : (finalFaces ? finalFaces[0] : (lastRoll ? Math.floor(lastRoll / 2) || 1 : 1));
  const d2show = rolling ? rollingFaces[1] : (finalFaces ? finalFaces[1] : (lastRoll ? (lastRoll - (Math.floor(lastRoll / 2) || 0)) || 1 : 1));
  const showDice = rolling || lastRoll !== null;

  return (
    <div className="flex items-center gap-3">
      <motion.button
        onClick={roll}
        disabled={disabled || rolling}
        whileTap={!disabled && !rolling ? { scale: 0.93 } : {}}
        className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-bold uppercase tracking-wide transition-all
          ${disabled ? "opacity-40 cursor-not-allowed border-zinc-600 text-zinc-500"
            : rolling ? "border-amber-500 text-amber-500 cursor-default"
            : "border-amber-500 text-amber-500 hover:bg-amber-500/10 cursor-pointer"}`}
      >
        🎲 {rolling ? "Rolling…" : "Roll Dice"}
      </motion.button>

      {showDice && (
        <div className="flex items-center gap-1">
          <DieFace value={d1show} rolling={rolling} />
          <DieFace value={d2show} rolling={rolling} />
          {!rolling && lastRoll !== null && (
            <AnimatePresence mode="wait">
              <motion.span
                key={lastRoll}
                initial={{ scale: 0.5, opacity: 0, y: -4 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="text-amber-500 font-bold text-sm ml-1"
              >
                = {lastRoll}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
