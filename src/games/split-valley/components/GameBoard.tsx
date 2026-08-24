import { HEXES, BRIDGES, RX, RY, getTeamSettlementSpots, getTeamRoadEdges } from "../gameState";
import type { GameState, Spot, Edge, Settlement, Watchtower } from "../gameState";

const HEX_FILL: Record<string, string> = {
  wood:   "#1a3d1e",
  brick:  "#5c2010",
  sheep:  "#2d5210",
  ore:    "#1e2030",
  wheat:  "#6b4a08",
  desert: "#2a2010",
};
const HEX_STROKE: Record<string, string> = {
  wood:   "#2d6030",
  brick:  "#7a2a15",
  sheep:  "#3d6818",
  ore:    "#303050",
  wheat:  "#8a6010",
  desert: "#f8b80060",
};
const RESOURCE_EMOJI: Record<string, string> = {
  wood: "🌲", brick: "🧱", sheep: "🐑", ore: "⛏", wheat: "🌾", desert: "🏕",
};

// Use the same RX/RY as gameState so visual vertices match interactive spots exactly.
function visHexPoints(cx: number, cy: number): string {
  const verts = [
    [cx + RX, cy],
    [cx + RX * 0.5, cy - RY],
    [cx - RX * 0.5, cy - RY],
    [cx - RX, cy],
    [cx - RX * 0.5, cy + RY],
    [cx + RX * 0.5, cy + RY],
  ];
  return verts.map(([x, y]) => `${x},${y}`).join(" ");
}

const hotNumbers = new Set([6, 8]);

interface GameBoardProps {
  state: GameState;
  placingSettlement: boolean;
  onPlaceSettlement: (spot: Spot) => void;
  placingCity: boolean;
  onUpgradeCity: (idx: number) => void;
  placingRoad: boolean;
  onPlaceRoad: (edge: Edge) => void;
  placingWatchtower: boolean;
  onPlaceWatchtower: (spot: Spot) => void;
  availableSpotKeys: Set<string>;
  targetingRaid: boolean;
  onRaidTargetSettlement: (idx: number) => void;
  onRaidTargetWatchtower: (idx: number) => void;
}

export default function GameBoard({
  state, placingSettlement, onPlaceSettlement, placingCity, onUpgradeCity,
  placingRoad, onPlaceRoad, placingWatchtower, onPlaceWatchtower, availableSpotKeys,
  targetingRaid, onRaidTargetSettlement, onRaidTargetWatchtower,
}: GameBoardProps) {
  const { lastRoll, settlements, roads = [], currentTurn } = state;

  const settlementSpots = placingSettlement ? getTeamSettlementSpots(currentTurn) : [];
  const roadEdges = placingRoad ? getTeamRoadEdges(currentTurn) : [];

  const isSpotOccupied = (spot: Spot) =>
    settlements.some(s => Math.abs(s.x - spot.x) < 0.5 && Math.abs(s.y - spot.y) < 0.5);

  const isRoadOccupied = (edge: Edge) => roads.some(r => r.key === edge.key);

  const isSpotPlaceable = (spot: Spot) => {
    if (isSpotOccupied(spot)) return false;
    const teamSettlements = settlements.filter(s => s.team === currentTurn);
    if (teamSettlements.length === 0) return true;
    return availableSpotKeys && availableSpotKeys.has(spot.key);
  };

  const isEdgePlaceable = (edge: Edge) => {
    if (isRoadOccupied(edge)) return false;
    if (!availableSpotKeys) return false;
    return availableSpotKeys.has(edge.spotKey1) || availableSpotKeys.has(edge.spotKey2);
  };

  const eaglesRoads = roads.filter(r => r.team === "eagles");
  const rattlerRoads = roads.filter(r => r.team === "rattlers");

  return (
    <div className="relative w-full" style={{ maxHeight: "calc(100vh - 180px)" }}>
      <div className="relative w-full" style={{ paddingBottom: "62.5%" }}>

        {/* SVG board */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ zIndex: 0 }}
        >
          {/* Background */}
          <rect width="100" height="100" fill="#0d1117" />

          {/* Eagles territory background */}
          <rect x="0" y="0" width="50" height="100" fill="#0a1a0c" opacity="0.8" />

          {/* Rattlers territory background */}
          <rect x="50" y="0" width="50" height="100" fill="#1a0a0a" opacity="0.8" />

          {/* Valley divider */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="#f8b800" strokeWidth="0.4" opacity="0.6" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="#f8b800" strokeWidth="2" opacity="0.08" />

          {/* Bridges — colored by claim ownership */}
          {BRIDGES.map(bridge => {
            const owner = (state.bridgeClaims ?? {})[bridge.id] as "eagles" | "rattlers" | null | undefined;
            const ownerSett = owner ? state.settlements.find(s => s.team === owner && s.spotKey === (owner === "eagles" ? bridge.eaglesSpotKey : bridge.rattlersSpotKey)) : null;
            const locked = ownerSett?.type === "city";

            const deckFill   = owner === "eagles" ? (locked ? "#1a3d6a" : "#152a4a") : owner === "rattlers" ? (locked ? "#6a1a1a" : "#4a1515") : "#5a3a10";
            const railStroke = owner === "eagles" ? (locked ? "#60a0ff" : "#3b82f6") : owner === "rattlers" ? (locked ? "#ff6060" : "#ef4444") : "#c8860a";
            const plankStroke = owner === "eagles" ? "#1e4a80" : owner === "rattlers" ? "#801e1e" : "#7a5020";
            const label = owner === "eagles" ? "🦅" : owner === "rattlers" ? "🐍" : "⚔";

            const overhang = 3;
            const x1 = bridge.x1 - overhang;
            const x2 = bridge.x2 + overhang;
            const w = x2 - x1;
            const bh = 2.6;
            return (
              <g key={`bridge-${bridge.id}`}>
                <rect x={x1} y={bridge.y1 - bh / 2 + 0.4} width={w} height={bh} fill="rgba(0,0,0,0.4)" />
                <rect x={x1} y={bridge.y1 - bh / 2} width={w} height={bh} fill={deckFill} stroke={railStroke} strokeWidth="0.3" />
                {Array.from({ length: Math.floor(w / 2.2) }).map((_, i) => (
                  <line key={i}
                    x1={x1 + i * 2.2 + 1.1} y1={bridge.y1 - bh / 2}
                    x2={x1 + i * 2.2 + 1.1} y2={bridge.y1 + bh / 2}
                    stroke={plankStroke} strokeWidth="0.25"
                  />
                ))}
                <line x1={x1} y1={bridge.y1 - bh / 2} x2={x2} y2={bridge.y1 - bh / 2} stroke={railStroke} strokeWidth="0.5" />
                <line x1={x1} y1={bridge.y1 + bh / 2} x2={x2} y2={bridge.y1 + bh / 2} stroke={railStroke} strokeWidth="0.5" />
                <text x={(bridge.x1 + bridge.x2) / 2} y={bridge.y1} textAnchor="middle" dominantBaseline="middle" fontSize="1.8" fill={owner ? railStroke : "#f8b800"} opacity="0.9" fontWeight="bold">{label}</text>
              </g>
            );
          })}

          {/* Team labels */}
          <text x="24" y="10" textAnchor="middle" fill="#3b82f6" fontSize="3" fontWeight="bold" opacity="0.7">🦅 EAGLES</text>
          <text x="76" y="10" textAnchor="middle" fill="#ef4444" fontSize="3" fontWeight="bold" opacity="0.7">🐍 RATTLERS</text>

          {/* Hex polygons */}
          {Object.entries(HEXES).map(([id, hex]) => (
            <polygon
              key={`hex-${id}`}
              points={visHexPoints(hex.x, hex.y)}
              fill={HEX_FILL[hex.resource]}
              stroke={HEX_STROKE[hex.resource]}
              strokeWidth="0.3"
            />
          ))}

          {/* Resource emoji labels */}
          {Object.entries(HEXES).map(([id, hex]) => (
            <text
              key={`icon-${id}`}
              x={hex.x}
              y={hex.y - 1.5}
              textAnchor="middle"
              fontSize="4"
              dominantBaseline="middle"
            >
              {RESOURCE_EMOJI[hex.resource]}
            </text>
          ))}

          {/* Active hex highlights */}
          {lastRoll !== null && Object.entries(state.hexes).map(([id, hex]) =>
            hex.number === lastRoll ? (
              <polygon
                key={`hl-${id}`}
                points={visHexPoints(hex.x, hex.y)}
                fill="rgba(250,204,21,0.25)"
                stroke="rgba(250,204,21,0.8)"
                strokeWidth="0.5"
              />
            ) : null
          )}

          {/* Number tokens — skip desert basecamps */}
          {Object.entries(state.hexes).map(([id, hex]) => {
            if (hex.resource === "desert") return null;
            const isActive = lastRoll !== null && hex.number === lastRoll;
            return (
              <g key={`num-${id}`}>
                <circle
                  cx={hex.x}
                  cy={hex.y + 2.5}
                  r="2.8"
                  fill={isActive ? "rgba(120,80,0,0.9)" : "rgba(0,0,0,0.75)"}
                  stroke={isActive ? "#facc15" : "transparent"}
                  strokeWidth="0.3"
                />
                <text
                  x={hex.x}
                  y={hex.y + 2.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="2.2"
                  fontWeight="bold"
                  fill={hotNumbers.has(hex.number) ? "#fca5a5" : "#ffffff"}
                >
                  {hex.number}
                </text>
              </g>
            );
          })}

          {/* Roads */}
          {eaglesRoads.map((r, i) => (
            <line key={`er-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#3b82f6" strokeWidth="0.8" strokeLinecap="round" opacity="0.9" />
          ))}
          {rattlerRoads.map((r, i) => (
            <line key={`rr-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#ef4444" strokeWidth="0.8" strokeLinecap="round" opacity="0.9" />
          ))}
        </svg>

        {/* Placed settlements & cities */}
        {settlements.map((s: Settlement, i: number) => {
          const canUpgrade = placingCity && s.team === currentTurn && s.type === "settlement";
          const isEnemy = s.team !== currentTurn;
          const isRaidTarget = targetingRaid && isEnemy;
          return (
            <div
              key={i}
              onClick={() => { if (canUpgrade) onUpgradeCity(i); else if (isRaidTarget) onRaidTargetSettlement(i); }}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 20,
                cursor: (canUpgrade || isRaidTarget) ? "pointer" : "default",
              }}
            >
              <div
                className={`flex items-center justify-center font-bold shadow-lg border-2 transition-all
                  ${s.team === "eagles" ? "bg-blue-600 border-blue-300 text-white" : "bg-red-700 border-red-300 text-white"}
                  ${s.type === "city" ? "w-7 h-7 text-base rounded-sm" : "w-5 h-5 text-xs rounded-sm"}
                  ${canUpgrade ? "ring-2 ring-yellow-400 scale-125 animate-pulse" : ""}
                  ${isRaidTarget ? "ring-2 ring-red-400 scale-110 animate-pulse brightness-125" : ""}`}
                title={isRaidTarget ? `Destroy ${s.team} ${s.type}` : `${s.team} ${s.type}`}
              >
                {s.type === "city" ? "🏙" : "🏠"}
              </div>
            </div>
          );
        })}

        {/* Placed watchtowers — standalone, offset slightly above the spot */}
        {(state.watchtowers ?? []).map((w: Watchtower, i: number) => {
          const isEnemyTower = w.team !== currentTurn;
          const isRaidTarget = targetingRaid && isEnemyTower;
          return (
            <div
              key={`wt-${i}`}
              onClick={() => { if (isRaidTarget) onRaidTargetWatchtower(i); }}
              style={{
                position: "absolute",
                left: `${w.x}%`,
                top: `${w.y}%`,
                transform: "translate(-50%, -160%)",
                zIndex: 22,
                cursor: isRaidTarget ? "pointer" : "default",
              }}
            >
              <div
                className={`flex items-center justify-center font-bold shadow-md border-2 w-4 h-4 text-[9px] rounded-sm transition-all
                  ${w.team === "eagles" ? "bg-blue-900 border-blue-400 text-white" : "bg-red-900 border-red-400 text-white"}
                  ${isRaidTarget ? "ring-2 ring-red-400 scale-125 animate-pulse brightness-125" : ""}`}
                title={isRaidTarget ? "Destroy this watchtower (-10% raid protection)" : `${w.team} watchtower`}
              >
                🗼
              </div>
            </div>
          );
        })}

        {/* Settlement placement spots */}
        {placingSettlement && settlementSpots.map((spot: Spot) => {
          const placeable = isSpotPlaceable(spot);
          if (isSpotOccupied(spot)) return null;
          return (
            <button
              key={spot.key}
              onClick={() => placeable && onPlaceSettlement(spot)}
              disabled={!placeable}
              style={{
                position: "absolute",
                left: `${spot.x}%`, top: `${spot.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 30, width: 14, height: 14, borderRadius: "50%", padding: 0,
              }}
              className={`border-2 transition-all duration-200 ${
                placeable
                  ? "bg-white/80 border-amber-500 hover:bg-amber-400 hover:scale-125 cursor-pointer"
                  : "bg-gray-500/30 border-gray-500/50 cursor-not-allowed"
              }`}
              title={placeable ? "Place settlement here" : "Build a road first"}
            />
          );
        })}

        {/* Watchtower placement spots — only on existing team settlements */}
        {placingWatchtower && settlements
          .filter(s => s.team === currentTurn && !(state.watchtowers ?? []).some(w => w.key === s.spotKey && w.team === currentTurn))
          .map((s: Settlement, i: number) => {
            const spot: Spot = { x: s.x, y: s.y, key: s.spotKey, adjacentHexIds: s.adjacentHexIds };
            return (
              <button
                key={`wt-spot-${i}`}
                onClick={() => onPlaceWatchtower(spot)}
                style={{
                  position: "absolute",
                  left: `${s.x}%`, top: `${s.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 30, width: 20, height: 20, borderRadius: "50%", padding: 0,
                }}
                className="bg-green-400/80 border-2 border-green-300 hover:bg-green-300 hover:scale-125 cursor-pointer transition-all duration-200 animate-pulse"
                title="Place watchtower on this settlement"
              />
            );
          })}

        {/* Road placement spots */}
        {placingRoad && roadEdges.map((edge: Edge) => {
          const placeable = isEdgePlaceable(edge);
          if (isRoadOccupied(edge)) return null;
          return (
            <button
              key={edge.key}
              onClick={() => placeable && onPlaceRoad(edge)}
              disabled={!placeable}
              style={{
                position: "absolute",
                left: `${edge.mx}%`, top: `${edge.my}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 30, width: 12, height: 12, borderRadius: 2, padding: 0,
              }}
              className={`border-2 transition-all duration-200 ${
                placeable
                  ? "bg-yellow-300/90 border-yellow-500 hover:bg-yellow-400 hover:scale-125 cursor-pointer"
                  : "bg-gray-500/20 border-gray-500/30 cursor-not-allowed"
              }`}
              title={placeable ? "Place road here" : "Not connected to your network"}
            />
          );
        })}
      </div>
    </div>
  );
}
