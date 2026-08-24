export type TeamId = "eagles" | "rattlers";
export type ResourceType = "wood" | "brick" | "sheep" | "ore" | "wheat";
export type HexResource = ResourceType | "desert";

export interface HexDef {
  label: string;
  resource: HexResource;
  x: number;
  y: number;
}

export interface HexWithNumber extends HexDef {
  number: number;
}

export interface Settlement {
  x: number;
  y: number;
  key: string;
  spotKey: string;
  team: TeamId;
  type: "settlement" | "city";
  adjacentHexIds: string[];
}

export interface Watchtower {
  x: number;
  y: number;
  key: string;
  team: TeamId;
}

export interface Road {
  key: string;
  team: TeamId;
  x1: number; y1: number;
  x2: number; y2: number;
  spotKey1: string;
  spotKey2: string;
}

export type Resources = Record<ResourceType, number>;

export interface GameState {
  currentTurn: TeamId;
  turn: number;
  hexes: Record<string, HexWithNumber>;
  resources: Record<TeamId, Resources>;
  settlements: Settlement[];
  roads: Road[];
  watchtowers: Watchtower[];
  lastRoll: number | null;
  bridgeClaims: Record<string, TeamId | null>;
}

export interface Spot {
  x: number;
  y: number;
  key: string;
  adjacentHexIds: string[];
}

export interface Edge {
  key: string;
  x1: number; y1: number;
  x2: number; y2: number;
  mx: number; my: number;
  spotKey1: string;
  spotKey2: string;
}

// Proper flat-top hex grid. RX=5, RY=6.8 matches visual rendering exactly.
// Row vertical spacing = 2*RY = 13.6. Diagonal X shift = RX = 5.
// Adjacent hexes share exact vertex coordinates → roads chain continuously.
//
// Eagles: x ∈ [7..42], rows y = 18, 31.6, 45.2, 58.8, 72.4
// Rattlers: mirror around x=50 → x ∈ [58..93]
export const HEXES: Record<string, HexDef> = {
  "A1":  { label: "Wood",  resource: "wood",  x: 17,   y: 18   },
  "A2":  { label: "Brick", resource: "brick", x: 27,   y: 18   },
  "A3":  { label: "Wood",  resource: "wood",  x: 12,   y: 31.6 },
  "A4":  { label: "Brick", resource: "brick", x: 22,   y: 31.6 },
  "A5":  { label: "Sheep", resource: "sheep", x: 32,   y: 31.6 },
  "A6":  { label: "Base",  resource: "desert", x: 17,   y: 45.2 },
  "A7":  { label: "Sheep", resource: "sheep", x: 27,   y: 45.2 },
  "A8":  { label: "Brick", resource: "brick", x: 37,   y: 45.2 },
  "A9":  { label: "Brick", resource: "brick", x: 12,   y: 58.8 },
  "A10": { label: "Sheep", resource: "sheep", x: 22,   y: 58.8 },
  "A11": { label: "Wood",  resource: "wood",  x: 32,   y: 58.8 },
  "A12": { label: "Sheep", resource: "sheep", x: 17,   y: 72.4 },

  "B1":  { label: "Ore",   resource: "ore",   x: 83,   y: 18   },
  "B2":  { label: "Wheat", resource: "wheat", x: 73,   y: 18   },
  "B3":  { label: "Ore",   resource: "ore",   x: 88,   y: 31.6 },
  "B4":  { label: "Wheat", resource: "wheat", x: 78,   y: 31.6 },
  "B5":  { label: "Sheep", resource: "sheep", x: 68,   y: 31.6 },
  "B6":  { label: "Base",  resource: "desert", x: 83,   y: 45.2 },
  "B7":  { label: "Sheep", resource: "sheep", x: 73,   y: 45.2 },
  "B8":  { label: "Wheat", resource: "wheat", x: 63,   y: 45.2 },
  "B9":  { label: "Wheat", resource: "wheat", x: 88,   y: 58.8 },
  "B10": { label: "Sheep", resource: "sheep", x: 78,   y: 58.8 },
  "B11": { label: "Ore",   resource: "ore",   x: 68,   y: 58.8 },
  "B12": { label: "Sheep", resource: "sheep", x: 83,   y: 72.4 },
};

// Must match VIS_RX / VIS_RY in GameBoard.tsx so vertices align with drawn hexes.
export const RX = 5.0;
export const RY = 6.8;

export function hexVertices(cx: number, cy: number): { x: number; y: number }[] {
  return [
    { x: cx + RX,       y: cy      },
    { x: cx + RX * 0.5, y: cy - RY },
    { x: cx - RX * 0.5, y: cy - RY },
    { x: cx - RX,       y: cy      },
    { x: cx - RX * 0.5, y: cy + RY },
    { x: cx + RX * 0.5, y: cy + RY },
  ];
}

export function getTeamSettlementSpots(team: TeamId): Spot[] {
  const prefix = team === "eagles" ? "A" : "B";
  const hexIds = Object.keys(HEXES).filter(id => id.startsWith(prefix));
  const spotMap: Record<string, Spot> = {};
  hexIds.forEach(hexId => {
    const hex = HEXES[hexId];
    hexVertices(hex.x, hex.y).forEach(v => {
      const key = `${Math.round(v.x * 10)}_${Math.round(v.y * 10)}`;
      if (!spotMap[key]) spotMap[key] = { x: v.x, y: v.y, key, adjacentHexIds: [] };
      if (!spotMap[key].adjacentHexIds.includes(hexId)) spotMap[key].adjacentHexIds.push(hexId);
    });
  });
  return Object.values(spotMap);
}

export function getTeamRoadEdges(team: TeamId): Edge[] {
  const prefix = team === "eagles" ? "A" : "B";
  const hexIds = Object.keys(HEXES).filter(id => id.startsWith(prefix));
  const edgeMap: Record<string, Edge> = {};
  hexIds.forEach(hexId => {
    const hex = HEXES[hexId];
    const verts = hexVertices(hex.x, hex.y);
    for (let i = 0; i < 6; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % 6];
      const k1 = `${Math.round(v1.x * 10)}_${Math.round(v1.y * 10)}`;
      const k2 = `${Math.round(v2.x * 10)}_${Math.round(v2.y * 10)}`;
      const edgeKey = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      if (!edgeMap[edgeKey]) {
        edgeMap[edgeKey] = {
          key: edgeKey,
          x1: v1.x, y1: v1.y,
          x2: v2.x, y2: v2.y,
          mx: (v1.x + v2.x) / 2,
          my: (v1.y + v2.y) / 2,
          spotKey1: k1,
          spotKey2: k2,
        };
      }
    }
  });
  return Object.values(edgeMap);
}

export function getReachableSpotKeys(team: TeamId, settlements: Settlement[], roads: Road[]): Set<string> {
  const teamSettlements = settlements.filter(s => s.team === team);
  const teamRoads = roads.filter(r => r.team === team);
  const reachable = new Set(teamSettlements.map(s => s.spotKey));
  let changed = true;
  while (changed) {
    changed = false;
    teamRoads.forEach(road => {
      if (reachable.has(road.spotKey1) && !reachable.has(road.spotKey2)) { reachable.add(road.spotKey2); changed = true; }
      if (reachable.has(road.spotKey2) && !reachable.has(road.spotKey1)) { reachable.add(road.spotKey1); changed = true; }
    });
  }
  return reachable;
}

export interface Bridge {
  id: string;
  x1: number; y1: number;  // Eagles-side anchor (vertex)
  x2: number; y2: number;  // Rattlers-side anchor (vertex)
  eaglesSpotKey: string;
  rattlersSpotKey: string;
}

// Bridges on opposite ends of the board.
// North: right vertex of A5 (37, 31.6) → left vertex of B5 (63, 31.6)
// South: right vertex of A11 (37, 58.8) → left vertex of B11 (63, 58.8)
export const BRIDGES: Bridge[] = [
  { id: "north", x1: 37, y1: 31.6, x2: 63, y2: 31.6, eaglesSpotKey: "370_316", rattlersSpotKey: "630_316" },
  { id: "south", x1: 37, y1: 58.8, x2: 63, y2: 58.8, eaglesSpotKey: "370_588", rattlersSpotKey: "630_588" },
];

const CATAN_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function assignNumbers(): Record<string, number> {
  const shuffled = [...CATAN_NUMBERS].sort(() => Math.random() - 0.5);
  const ids = Object.keys(HEXES);
  return Object.fromEntries(ids.map((id, i) => [id, shuffled[i % shuffled.length]]));
}

// Starting basecamp settlements — left tip of A6, right tip of B6 (desert hexes, no production)
export const BASECAMP_SETTLEMENTS: Settlement[] = [
  { x: 12, y: 45.2, key: "120_452", spotKey: "120_452", team: "eagles",   type: "settlement", adjacentHexIds: ["A6"] },
  { x: 88, y: 45.2, key: "880_452", spotKey: "880_452", team: "rattlers", type: "settlement", adjacentHexIds: ["B6"] },
];

export function makeInitialState(): GameState {
  const numbers = assignNumbers();
  return {
    currentTurn: "eagles",
    turn: 1,
    hexes: Object.fromEntries(
      Object.entries(HEXES).map(([id, hex]) => [id, { ...hex, number: numbers[id] }])
    ),
    resources: {
      eagles:   { wood: 2, brick: 2, sheep: 2, ore: 0, wheat: 0 },
      rattlers: { wood: 2, brick: 2, sheep: 2, ore: 0, wheat: 0 },
    },
    settlements: [...BASECAMP_SETTLEMENTS],
    roads: [],
    watchtowers: [],
    lastRoll: null,
    bridgeClaims: { north: null, south: null },
  };
}

export const RESOURCE_ICONS: Record<string, string> = {
  wood:  "🌲",
  brick: "🧱",
  sheep: "🐑",
  ore:   "⛏",
  wheat: "🌾",
};
