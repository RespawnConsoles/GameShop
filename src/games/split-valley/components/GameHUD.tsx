import DiceRoller from "./DiceRoller";
import ResourceCards from "./ResourceCards";
import type { GameState } from "../gameState";

interface GameHUDProps {
  state: GameState;
  phase: "roll" | "build";
  diceRolled: boolean;
  placingSettlement: boolean;
  placingCity: boolean;
  placingRoad: boolean;
  placingWatchtower: boolean;
  eaglesVP: number;
  rattlersVP: number;
  botThinking: boolean;
  mode: "bot" | "passplay";
  onRoll: (d1: number, d2: number) => void;
  onBuildSettlement: () => void;
  onBuildCity: () => void;
  onBuildRoad: () => void;
  onCancelPlace: () => void;
  onTrade: () => void;
  onEndTurn: () => void;
  onRaid: () => void;
  onRaidSteal: () => void;
  onRaidDestroy: () => void;
  onCancelRaid: () => void;
  raidPhase: "idle" | "choosing" | "targeting";
  onBuildWatchtower: () => void;
  tradeUnlocked: boolean;
  canRaid: boolean;
  raidCooldown: number;
}

export default function GameHUD({
  state, phase, diceRolled, placingSettlement, placingCity, placingRoad, placingWatchtower,
  eaglesVP, rattlersVP, botThinking, mode,
  onRoll, onBuildSettlement, onBuildCity, onBuildRoad, onCancelPlace, onTrade, onEndTurn,
  onRaid, onRaidSteal, onRaidDestroy, onCancelRaid, raidPhase,
  onBuildWatchtower, tradeUnlocked, canRaid, raidCooldown,
}: GameHUDProps) {
  const { currentTurn, resources, turn, lastRoll } = state;
  const isPlacing = placingSettlement || placingCity || placingRoad || placingWatchtower;

  return (
    <div className="bg-zinc-900 text-white px-4 py-3 flex flex-wrap items-center gap-4 border-b border-zinc-700 font-mono text-sm">
      {/* Turn + VP */}
      <div className="flex flex-col gap-0.5 min-w-fit">
        <span className="text-zinc-500 text-xs uppercase tracking-widest">Turn {turn}</span>
        <span className={`px-3 py-1 font-bold text-xs uppercase tracking-wide ${currentTurn === "eagles" ? "bg-blue-600 text-white" : "bg-red-700 text-white"}`}>
          {currentTurn === "eagles" ? "🦅 Eagles" : "🐍 Rattlers"}
        </span>
      </div>

      {/* Mode badge */}
      <span className="text-[9px] px-2 py-0.5 border" style={{ borderColor: "#333", color: "#555", fontFamily: "inherit" }}>
        {mode === "bot" ? "🤖 VS BOT" : "👥 PASS & PLAY"}
      </span>

      {/* VP Scores */}
      <div className="flex gap-3 text-xs">
        <span className="text-blue-400 font-bold">🦅 {eaglesVP} VP</span>
        <span className="text-zinc-600">·</span>
        <span className="text-red-400 font-bold">🐍 {rattlersVP} VP</span>
        <span className="text-zinc-600 text-[10px]">(15 to win)</span>
      </div>

      {/* Resources Eagles */}
      <ResourceCards resources={resources.eagles} label="🦅 Eagles" color="text-blue-400" />

      {/* Resources Rattlers */}
      <ResourceCards resources={resources.rattlers} label="🐍 Rattlers" color="text-red-400" />

      {/* Actions */}
      <div className="flex gap-2 ml-auto flex-wrap items-center">
        {botThinking && (
          <span className="text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
            🤖 Bot thinking…
          </span>
        )}

        {!botThinking && isPlacing && (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wide animate-pulse">
              {placingSettlement ? "📍 Click a dot to place settlement"
               : placingCity ? "🏙 Click your settlement to upgrade"
               : placingWatchtower ? "🗼 Click a settlement to place watchtower"
               : "🛣 Click a square to place road"}
            </span>
            <button onClick={onCancelPlace} className="text-xs border border-zinc-600 text-zinc-400 px-2 py-1 hover:text-white">
              Cancel
            </button>
          </div>
        )}

        {!botThinking && phase === "roll" && !isPlacing && (
          <DiceRoller onRoll={onRoll} lastRoll={lastRoll} disabled={diceRolled} />
        )}

        {!botThinking && phase === "build" && !isPlacing && (
          <>
            <DiceRoller onRoll={onRoll} lastRoll={lastRoll} disabled={diceRolled} />
            <button
              onClick={onBuildSettlement}
              className="bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700 border border-zinc-600"
              title="Cost: 1 Wood + 1 Brick (free on first placement)"
            >
              🏠 Settlement (🌲+🧱)
            </button>
            <button
              onClick={onBuildRoad}
              className="bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700 border border-zinc-600"
              title="Cost: 1 Wood + 1 Brick"
            >
              🛣 Road (🌲+🧱)
            </button>
            <button
              onClick={onBuildCity}
              className="bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700 border border-zinc-600"
              title="Cost: 1 Ore + 1 Wheat + 1 Wood + 1 Brick — upgrades a settlement"
            >
              🏙 City (⛏+🌾+🌲+🧱)
            </button>
            <button
              onClick={onBuildWatchtower}
              className="bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-zinc-700 border border-zinc-600"
              title="Cost: 2 Sheep — each watchtower adds 10% chance raids are capped at 1 resource (max 5 = 50%)"
            >
              🗼 Watchtower (🐑🐑)
            </button>
            {raidPhase === "choosing" ? (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-bold uppercase tracking-wide">⚔️ Raid:</span>
                <button onClick={onRaidSteal} className="border border-amber-500 text-amber-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-amber-500/10 cursor-pointer">
                  💰 Steal Resources
                </button>
                <button onClick={onRaidDestroy} className="border border-red-500 text-red-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-red-500/10 cursor-pointer">
                  💥 Destroy Structure
                </button>
                <button onClick={onCancelRaid} className="text-xs border border-zinc-600 text-zinc-400 px-2 py-1 hover:text-white">Cancel</button>
              </div>
            ) : raidPhase === "targeting" ? (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-bold uppercase tracking-wide animate-pulse">💥 Click enemy structure to destroy</span>
                <button onClick={onCancelRaid} className="text-xs border border-zinc-600 text-zinc-400 px-2 py-1 hover:text-white">Cancel</button>
              </div>
            ) : (
              <button
                onClick={onRaid}
                disabled={!canRaid}
                title={!canRaid ? (raidCooldown > 0 ? `Cooldown: ${raidCooldown} turn${raidCooldown !== 1 ? "s" : ""} left` : "Need a settlement at a bridge + at least 1 resource") : "Raid: pay 1 resource, then choose to steal or destroy"}
                className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                  canRaid
                    ? "border-red-500 text-red-400 hover:bg-red-500/10 cursor-pointer"
                    : "border-zinc-700 text-zinc-600 cursor-not-allowed"
                }`}
              >
                ⚔️ Raid {!canRaid && <span className="text-[10px] normal-case font-normal">({raidCooldown > 0 ? `${raidCooldown}t cd` : "no bridge"})</span>}
              </button>
            )}
            <button
              onClick={onTrade}
              disabled={!tradeUnlocked}
              title={!tradeUnlocked ? "Both teams need at least 3 settlements to unlock trading" : ""}
              className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                tradeUnlocked
                  ? "border-amber-500 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                  : "border-zinc-700 text-zinc-600 cursor-not-allowed"
              }`}
            >
              🤝 Trade {!tradeUnlocked && <span className="text-[10px] normal-case font-normal">(locked)</span>}
            </button>
            <button
              onClick={onEndTurn}
              className="bg-white text-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:opacity-90"
            >
              End Turn →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
