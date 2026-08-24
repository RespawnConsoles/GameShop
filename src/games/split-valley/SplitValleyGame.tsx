import { useState, useMemo, useEffect, useRef } from 'react';
import GameBoard from './components/GameBoard';
import GameHUD from './components/GameHUD';
import GameLog from './components/GameLog';
import TradeModal from './components/TradeModal';
import {
  makeInitialState, getReachableSpotKeys, getTeamSettlementSpots, getTeamRoadEdges,
  BRIDGES, BASECAMP_SETTLEMENTS,
  type GameState, type Settlement, type Road, type Watchtower, type Spot, type Edge, type Resources,
} from './gameState';

interface BotWeights {
  expansionBias: number;
  cityBias: number;
  roadFirstBias: number;
  games: number;
}

type Phase = 'roll' | 'build';
const WIN_VP = 15;
const mode: 'bot' = 'bot';

const BASECAMP_KEYS = new Set(BASECAMP_SETTLEMENTS.map(s => s.key));

function getVP(settlements: Settlement[], team: string): number {
  return settlements
    .filter(s => s.team === team && !BASECAMP_KEYS.has(s.key))
    .reduce((sum, s) => sum + (s.type === 'city' ? 2 : 1), 0);
}

function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  return Object.entries(cost).every(([r, n]) => (resources[r as keyof Resources] || 0) >= (n ?? 0));
}

function computeRollResources(state: GameState, total: number): GameState['resources'] {
  const newResources = {
    eagles: { ...state.resources.eagles },
    rattlers: { ...state.resources.rattlers },
  };
  state.settlements.forEach(s => {
    (s.adjacentHexIds || []).forEach(hexId => {
      const hex = state.hexes[hexId];
      if (hex?.number === total && hex.resource !== 'desert') {
        const amount = s.type === 'city' ? 2 : 1;
        const team = s.team as 'eagles' | 'rattlers';
        (newResources[team] as Record<string, number>)[hex.resource] =
          ((newResources[team] as Record<string, number>)[hex.resource] || 0) + amount;
      }
    });
  });
  return newResources;
}

function isTeamStuck(team: 'eagles' | 'rattlers', state: GameState): boolean {
  const res = state.resources[team];
  if (res.wood >= 1 && res.brick >= 1) return false;
  const teamS = state.settlements.filter(s => s.team === team);
  const totalRes = Object.values(res).reduce((a, b) => a + b, 0);
  const hasAnyProduction = teamS.some(s =>
    s.adjacentHexIds.some(id => state.hexes[id]?.resource !== 'desert')
  );
  const bridgeKeys = new Set(teamS.map(s => s.spotKey));
  const canRaid = totalRes > 0 && BRIDGES.some(b =>
    bridgeKeys.has(team === 'eagles' ? b.eaglesSpotKey : b.rattlersSpotKey)
  );
  return totalRes === 0 && !hasAnyProduction && !canRaid;
}

const teamLabel = (team: string) => team === 'eagles' ? '🦅 Eagles' : '🐍 Rattlers';

export function SplitValleyGame({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<GameState>(() => makeInitialState());
  const [phase, setPhase] = useState<Phase>('roll');
  const [diceRolled, setDiceRolled] = useState(false);
  const [placingSettlement, setPlacingSettlement] = useState(false);
  const [placingCity, setPlacingCity] = useState(false);
  const [placingRoad, setPlacingRoad] = useState(false);
  const [placingWatchtower, setPlacingWatchtower] = useState(false);
  const [log, setLog] = useState<string[]>(['⚔️ Split Valley begins! Eagles move first. Roll to start.']);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [lastRaidTurn, setLastRaidTurn] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [botEvaluatingTrade, setBotEvaluatingTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<'accepted' | 'declined' | null>(null);
  const [raidPhase, setRaidPhase] = useState<'idle' | 'choosing' | 'targeting'>('idle');
  const botRunning = useRef(false);
  const botWeights = useRef<BotWeights>({ expansionBias: 0.5, cityBias: 0.35, roadFirstBias: 0.5, games: 0 });
  const usedWeights = useRef<BotWeights | null>(null);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev.slice(0, 49)]);

  const tradeUnlocked =
    state.settlements.filter(s => s.team === 'eagles').length >= 3 &&
    state.settlements.filter(s => s.team === 'rattlers').length >= 3;

  const availableSpotKeys = useMemo(
    () => getReachableSpotKeys(state.currentTurn, state.settlements, state.roads),
    [state.currentTurn, state.settlements, state.roads]
  );

  const eaglesVP = getVP(state.settlements, 'eagles');
  const rattlersVP = getVP(state.settlements, 'rattlers');

  // Win / draw / starvation check
  useEffect(() => {
    if (winner || isDraw) return;
    if (eaglesVP >= WIN_VP) { setWinner('eagles'); return; }
    if (rattlersVP >= WIN_VP) { setWinner('rattlers'); return; }
    const eaglesAnnihilated = state.settlements.filter(s => s.team === 'eagles').length === 0 && state.watchtowers.filter(w => w.team === 'eagles').length === 0;
    const rattlersAnnihilated = state.settlements.filter(s => s.team === 'rattlers').length === 0 && state.watchtowers.filter(w => w.team === 'rattlers').length === 0;
    if (eaglesAnnihilated) { setWinner('rattlers'); return; }
    if (rattlersAnnihilated) { setWinner('eagles'); return; }
    const eaglesStuck = isTeamStuck('eagles', state);
    const rattlersStuck = isTeamStuck('rattlers', state);
    if (eaglesStuck && rattlersStuck) { setIsDraw(true); }
    else if (eaglesStuck) setWinner('rattlers');
    else if (rattlersStuck) setWinner('eagles');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eaglesVP, rattlersVP, state.settlements, state.watchtowers, state.currentTurn, winner, isDraw]);

  // ── Bot AI (Rattlers) ────────────────────────────────────────────────────
  useEffect(() => {
    if (state.currentTurn !== 'rattlers' || phase !== 'roll' || winner || botRunning.current) return;
    botRunning.current = true;
    setBotThinking(true);

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const w = botWeights.current;
    const sampled: BotWeights = {
      expansionBias: clamp01(w.expansionBias + (Math.random() - 0.5) * 0.15),
      cityBias: clamp01(w.cityBias + (Math.random() - 0.5) * 0.15),
      roadFirstBias: clamp01(w.roadFirstBias + (Math.random() - 0.5) * 0.15),
      games: w.games,
    };
    if (!usedWeights.current) usedWeights.current = sampled;

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const total = d1 + d2;
    const rolled = computeRollResources(state, total);
    const newResources = {
      eagles: { ...rolled.eagles, wood: rolled.eagles.wood + 1, brick: rolled.eagles.brick + 1 },
      rattlers: { ...rolled.rattlers, wood: rolled.rattlers.wood + 1, brick: rolled.rattlers.brick + 1 },
    };

    type BotAction =
      | { type: 'settlement'; spot: Spot }
      | { type: 'road'; edge: Edge }
      | { type: 'city'; idx: number }
      | { type: 'raid'; raidAction: 'steal' | 'destroy'; targetIdx?: number };

    function planActions(): BotAction[] {
      const allSpots = getTeamSettlementSpots('rattlers');
      const allEdges = getTeamRoadEdges('rattlers');
      const simSettlements: Settlement[] = [...state.settlements];
      const simRoads: Road[] = [...state.roads];
      const occupiedSpots = new Set(simSettlements.map(s => s.spotKey));
      const occupiedEdges = new Set(simRoads.map(r => r.key));
      const simRes = { ...newResources.rattlers };
      const actions: BotAction[] = [];

      const canBotRaid =
        (lastRaidTurn === null || state.turn - lastRaidTurn >= 4) &&
        BRIDGES.some(b => simSettlements.some(s => s.team === 'rattlers' && s.spotKey === b.rattlersSpotKey)) &&
        Object.values(simRes).reduce((a, b) => a + b, 0) > 0;

      if (canBotRaid && Math.random() < 0.45) {
        const eaglesSettlements = state.settlements.filter(s => s.team === 'eagles');
        const eaglesTotalRes = Object.values(state.resources.eagles).reduce((a, b) => a + b, 0);
        const eaglesCities = eaglesSettlements.filter(s => s.type === 'city');
        const eaglesWatchtowers = state.watchtowers.filter(w => w.team === 'eagles');
        const wantsDestroy = (eaglesCities.length > 0 || eaglesWatchtowers.length > 0) && Math.random() < 0.45;
        if (wantsDestroy) {
          const cityIdx = state.settlements.findIndex(s => s.team === 'eagles' && s.type === 'city');
          const wtIdx = eaglesWatchtowers.length > 0 ? 0 : -1;
          if (cityIdx >= 0 && Math.random() < 0.6) {
            actions.push({ type: 'raid', raidAction: 'destroy', targetIdx: cityIdx });
          } else if (wtIdx >= 0) {
            actions.push({ type: 'raid', raidAction: 'destroy', targetIdx: -(wtIdx + 1) });
          } else {
            actions.push({ type: 'raid', raidAction: 'steal' });
          }
        } else if (eaglesTotalRes > 0) {
          actions.push({ type: 'raid', raidAction: 'steal' });
        }
      }

      const spotSort = (a: Spot, b: Spot) =>
        sampled.expansionBias > 0.5 ? a.x - b.x : b.x - a.x;
      const edgeSort = (a: Edge, b: Edge) =>
        sampled.expansionBias > 0.5 ? a.mx - b.mx : b.mx - a.mx;

      for (let iter = 0; iter < 4; iter++) {
        const rattlerCount = simSettlements.filter(s => s.team === 'rattlers').length;
        const reachable = getReachableSpotKeys('rattlers', simSettlements, simRoads);
        const buildableEdges = allEdges
          .filter(e => !occupiedEdges.has(e.key) && (reachable.has(e.spotKey1) || reachable.has(e.spotKey2)))
          .sort(edgeSort);
        const reachableSpots = allSpots
          .filter(sp => !occupiedSpots.has(sp.key) && reachable.has(sp.key))
          .sort(spotSort);
        const freeSpots = allSpots
          .filter(sp => !occupiedSpots.has(sp.key))
          .sort(spotSort);

        const canRoad = simRes.wood >= 1 && simRes.brick >= 1 && rattlerCount > 0;
        const canSettle = simRes.wood >= 1 && simRes.brick >= 1;
        const canCity = simRes.ore >= 1 && simRes.wheat >= 1 && simRes.wood >= 1 && simRes.brick >= 1;
        const cityIdx = simSettlements.findIndex(s => s.team === 'rattlers' && s.type === 'settlement');

        const preferRoad = Math.random() < sampled.roadFirstBias;
        const preferCity = Math.random() < sampled.cityBias;
        void freeSpots;

        if (preferCity && canCity && cityIdx >= 0) {
          actions.push({ type: 'city', idx: cityIdx });
          simSettlements[cityIdx] = { ...simSettlements[cityIdx], type: 'city' };
          simRes.ore -= 1; simRes.wheat -= 1; simRes.wood -= 1; simRes.brick -= 1;
          continue;
        }

        if (preferRoad) {
          if (canRoad && buildableEdges.length > 0) {
            const edge = buildableEdges[0];
            actions.push({ type: 'road', edge });
            simRoads.push({ key: edge.key, team: 'rattlers', x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, spotKey1: edge.spotKey1, spotKey2: edge.spotKey2 });
            occupiedEdges.add(edge.key);
            simRes.wood -= 1; simRes.brick -= 1;
            continue;
          }
          if (canSettle && reachableSpots.length > 0) {
            const spot = reachableSpots[0];
            actions.push({ type: 'settlement', spot });
            simSettlements.push({ x: spot.x, y: spot.y, key: spot.key, spotKey: spot.key, team: 'rattlers', type: 'settlement', adjacentHexIds: spot.adjacentHexIds });
            occupiedSpots.add(spot.key);
            simRes.wood -= 1; simRes.brick -= 1;
            continue;
          }
        } else {
          if (canSettle && reachableSpots.length > 0) {
            const spot = reachableSpots[0];
            actions.push({ type: 'settlement', spot });
            simSettlements.push({ x: spot.x, y: spot.y, key: spot.key, spotKey: spot.key, team: 'rattlers', type: 'settlement', adjacentHexIds: spot.adjacentHexIds });
            occupiedSpots.add(spot.key);
            simRes.wood -= 1; simRes.brick -= 1;
            continue;
          }
          if (canRoad && buildableEdges.length > 0) {
            const edge = buildableEdges[0];
            actions.push({ type: 'road', edge });
            simRoads.push({ key: edge.key, team: 'rattlers', x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, spotKey1: edge.spotKey1, spotKey2: edge.spotKey2 });
            occupiedEdges.add(edge.key);
            simRes.wood -= 1; simRes.brick -= 1;
            continue;
          }
        }

        if (canCity && cityIdx >= 0) {
          actions.push({ type: 'city', idx: cityIdx });
          simSettlements[cityIdx] = { ...simSettlements[cityIdx], type: 'city' };
          simRes.ore -= 1; simRes.wheat -= 1; simRes.wood -= 1; simRes.brick -= 1;
          continue;
        }

        break;
      }

      return actions;
    }

    const actions = planActions();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const t1 = setTimeout(() => {
      setState(prev => ({ ...prev, lastRoll: total, resources: newResources }));
      setDiceRolled(true);
      setPhase('build');
      addLog(`🎲 🐍 Rattlers rolled ${total} (${d1}+${d2})`);

      actions.forEach((action, i) => {
        const t = setTimeout(() => {
          if (action.type === 'settlement') {
            const spot = action.spot;
            setState(prev => {
              const isFirst = prev.settlements.filter(s => s.team === 'rattlers').length === 0;
              const res = { ...prev.resources.rattlers };
              if (!isFirst) { res.wood -= 1; res.brick -= 1; }
              const newS: Settlement[] = [...prev.settlements, { x: spot.x, y: spot.y, key: spot.key, spotKey: spot.key, team: 'rattlers', type: 'settlement', adjacentHexIds: spot.adjacentHexIds }];
              const claimedBridge = BRIDGES.find(b => b.rattlersSpotKey === spot.key && !prev.bridgeClaims[b.id]);
              const bridgeClaims = claimedBridge ? { ...prev.bridgeClaims, [claimedBridge.id]: 'rattlers' as const } : prev.bridgeClaims;
              if (claimedBridge) addLog(`🌉 🐍 Rattlers claimed the ${claimedBridge.id} bridge!`);
              addLog(`🏠 🐍 Rattlers built a settlement (${getVP(newS, 'rattlers')} VP)`);
              return { ...prev, settlements: newS, resources: { ...prev.resources, rattlers: res }, bridgeClaims };
            });
          } else if (action.type === 'road') {
            const edge = action.edge;
            setState(prev => {
              const res = { ...prev.resources.rattlers, wood: prev.resources.rattlers.wood - 1, brick: prev.resources.rattlers.brick - 1 };
              addLog('🛣 🐍 Rattlers built a road');
              return { ...prev, roads: [...prev.roads, { key: edge.key, team: 'rattlers', x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, spotKey1: edge.spotKey1, spotKey2: edge.spotKey2 }], resources: { ...prev.resources, rattlers: res } };
            });
          } else if (action.type === 'raid') {
            setState(prev => {
              const botRes = { ...prev.resources.rattlers } as Record<string, number>;
              const eaglesRes = { ...prev.resources.eagles } as Record<string, number>;
              const raidCosts = (Object.entries(botRes) as [string, number][]).filter(([, n]) => n > 0);
              if (raidCosts.length === 0) return prev;
              const [costRes] = raidCosts[Math.floor(Math.random() * raidCosts.length)];
              botRes[costRes] -= 1;
              const icons: Record<string, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', ore: '⛏', wheat: '🌾' };

              if (action.raidAction === 'steal') {
                const towerCount = prev.watchtowers.filter(w => w.team === 'eagles').length;
                const cappedAtOne = towerCount > 0 && Math.random() < towerCount * 0.1;
                const botOwnsBoth = BRIDGES.every(b => (prev.bridgeClaims ?? {})[b.id] === 'rattlers');
                const stealMax = cappedAtOne ? 1 : (botOwnsBoth ? 4 : 2);
                const stolenMap: Record<string, number> = {};
                for (let si = 0; si < stealMax; si++) {
                  const avail = (Object.entries(eaglesRes) as [string, number][]).filter(([, n]) => n > 0);
                  if (!avail.length) break;
                  const [r] = avail[Math.floor(Math.random() * avail.length)];
                  stolenMap[r] = (stolenMap[r] || 0) + 1;
                  eaglesRes[r] -= 1;
                  botRes[r] = (botRes[r] || 0) + 1;
                }
                const stolenStr = Object.entries(stolenMap).map(([r, n]) => `${n}×${icons[r]}`).join(' ') || 'nothing';
                addLog(`⚔️ 🐍 Rattlers raided! Paid 1×${icons[costRes]}, stole ${stolenStr}${cappedAtOne ? ' (🗼 blocked)' : ''}`);
                setLastRaidTurn(prev.turn);
                return { ...prev, resources: { eagles: eaglesRes as Resources, rattlers: botRes as Resources } };
              } else {
                const tIdx = action.targetIdx ?? 0;
                if (tIdx < 0) {
                  const wtIdx = -(tIdx + 1);
                  const newWatchtowers = prev.watchtowers.filter((_, i) => i !== wtIdx);
                  const remaining = newWatchtowers.filter(w => w.team === 'eagles').length;
                  addLog(`💥 🐍 Rattlers destroyed an Eagles watchtower! (-10% raid protection, ${remaining} remain) Paid 1×${icons[costRes]}`);
                  setLastRaidTurn(prev.turn);
                  return { ...prev, watchtowers: newWatchtowers, resources: { ...prev.resources, rattlers: botRes as Resources } };
                } else {
                  const target = prev.settlements[tIdx];
                  if (!target || target.team !== 'eagles') return prev;
                  let newSettlements: Settlement[];
                  if (target.type === 'city') {
                    newSettlements = prev.settlements.map((s, j) => j === tIdx ? { ...s, type: 'settlement' as const } : s);
                    addLog(`💥 🐍 Rattlers destroyed an Eagles city! (downgraded, -1 VP) Paid 1×${icons[costRes]}`);
                  } else {
                    newSettlements = prev.settlements.filter((_, j) => j !== tIdx);
                    addLog(`💥 🐍 Rattlers razed an Eagles settlement! (-1 VP) Paid 1×${icons[costRes]}`);
                  }
                  setLastRaidTurn(prev.turn);
                  return { ...prev, settlements: newSettlements, resources: { ...prev.resources, rattlers: botRes as Resources } };
                }
              }
            });
          } else if (action.type === 'city') {
            const idx = action.idx;
            setState(prev => {
              const res = { ...prev.resources.rattlers, ore: prev.resources.rattlers.ore - 1, wheat: prev.resources.rattlers.wheat - 1, wood: prev.resources.rattlers.wood - 1, brick: prev.resources.rattlers.brick - 1 };
              const newS = prev.settlements.map((s, j) => j === idx ? { ...s, type: 'city' as const } : s);
              const spotKey = prev.settlements[idx].spotKey;
              let bridgeClaims = { ...prev.bridgeClaims };
              for (const bridge of BRIDGES) {
                if (spotKey !== bridge.rattlersSpotKey) continue;
                const currentOwner = bridgeClaims[bridge.id];
                if (currentOwner === 'eagles') {
                  const eaglesLocked = prev.settlements.some(s => s.team === 'eagles' && s.spotKey === bridge.eaglesSpotKey && s.type === 'city');
                  if (!eaglesLocked) { bridgeClaims[bridge.id] = 'rattlers'; addLog(`⚔️ 🐍 Rattlers contested the ${bridge.id} bridge!`); }
                } else if (!currentOwner) {
                  bridgeClaims[bridge.id] = 'rattlers'; addLog(`🌉 🐍 Rattlers claimed the ${bridge.id} bridge!`);
                }
              }
              addLog(`🏙 🐍 Rattlers upgraded to city (${getVP(newS, 'rattlers')} VP)`);
              return { ...prev, settlements: newS, resources: { ...prev.resources, rattlers: res }, bridgeClaims };
            });
          }
        }, (i + 1) * 400);
        timers.push(t);
      });

      const endT = setTimeout(() => {
        setState(prev => ({ ...prev, currentTurn: 'eagles', lastRoll: null, turn: prev.turn + 1 }));
        setPhase('roll');
        setDiceRolled(false);
        setBotThinking(false);
        botRunning.current = false;
        addLog("↩️ 🦅 Eagles' turn begins — roll the dice!");
      }, (actions.length + 1) * 400);
      timers.push(endT);
    }, 400);

    return () => {
      clearTimeout(t1);
      timers.forEach(clearTimeout);
      botRunning.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTurn, winner]);

  const handleRoll = (d1: number, d2: number) => {
    const total = d1 + d2;
    const rolled = computeRollResources(state, total);
    const newResources = {
      eagles: { ...rolled.eagles, wood: rolled.eagles.wood + 1, brick: rolled.eagles.brick + 1 },
      rattlers: { ...rolled.rattlers, wood: rolled.rattlers.wood + 1, brick: rolled.rattlers.brick + 1 },
    };
    setState(prev => ({ ...prev, lastRoll: total, resources: newResources }));
    setDiceRolled(true);
    setPhase('build');
    addLog(`🎲 ${teamLabel(state.currentTurn)} rolled ${total} (${d1}+${d2})`);
  };

  const handleBuildSettlement = () => {
    const team = state.currentTurn;
    const res = state.resources[team];
    const isFirst = state.settlements.filter(s => s.team === team).length === 0;
    if (!isFirst && !canAfford(res, { wood: 1, brick: 1 })) {
      addLog(`❌ ${teamLabel(team)} needs 🌲+🧱`); return;
    }
    setPlacingSettlement(true); setPlacingCity(false); setPlacingRoad(false);
  };

  const handleBuildRoad = () => {
    const team = state.currentTurn;
    if (!canAfford(state.resources[team], { wood: 1, brick: 1 })) {
      addLog(`❌ ${teamLabel(team)} needs 🌲+🧱`); return;
    }
    if (state.settlements.filter(s => s.team === team).length === 0) {
      addLog('❌ Place a settlement first'); return;
    }
    setPlacingRoad(true); setPlacingSettlement(false); setPlacingCity(false);
  };

  const handleBuildCity = () => {
    const team = state.currentTurn;
    if (!canAfford(state.resources[team], { ore: 1, wheat: 1, wood: 1, brick: 1 })) {
      addLog(`❌ ${teamLabel(team)} needs ⛏+🌾+🌲+🧱`); return;
    }
    if (!state.settlements.some(s => s.team === team && s.type === 'settlement')) {
      addLog('❌ No settlement to upgrade'); return;
    }
    setPlacingCity(true); setPlacingSettlement(false); setPlacingRoad(false);
  };

  const handlePlaceSettlement = (spot: Spot) => {
    const team = state.currentTurn;
    const res = { ...state.resources[team] };
    const isFirst = state.settlements.filter(s => s.team === team).length === 0;
    if (!isFirst) { res.wood -= 1; res.brick -= 1; }
    const newSettlements: Settlement[] = [
      ...state.settlements,
      { x: spot.x, y: spot.y, key: spot.key, spotKey: spot.key, team, type: 'settlement', adjacentHexIds: spot.adjacentHexIds },
    ];
    const claimedBridge = BRIDGES.find(b =>
      (team === 'eagles' ? b.eaglesSpotKey : b.rattlersSpotKey) === spot.key &&
      !state.bridgeClaims[b.id]
    );
    const bridgeClaims = claimedBridge
      ? { ...state.bridgeClaims, [claimedBridge.id]: team }
      : state.bridgeClaims;
    setState(prev => ({ ...prev, settlements: newSettlements, resources: { ...prev.resources, [team]: res }, bridgeClaims }));
    setPlacingSettlement(false);
    const vp = getVP(newSettlements, team);
    if (claimedBridge) addLog(`🌉 ${teamLabel(team)} claimed the ${claimedBridge.id} bridge!`);
    addLog(`🏠 ${teamLabel(team)} built a settlement (${vp} VP total)`);
  };

  const handlePlaceRoad = (edge: Edge) => {
    const team = state.currentTurn;
    const res = { ...state.resources[team], wood: state.resources[team].wood - 1, brick: state.resources[team].brick - 1 };
    const newRoads: Road[] = [
      ...state.roads,
      { key: edge.key, team, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, spotKey1: edge.spotKey1, spotKey2: edge.spotKey2 },
    ];
    setState(prev => ({ ...prev, roads: newRoads, resources: { ...prev.resources, [team]: res } }));
    setPlacingRoad(false);
    addLog(`🛣 ${teamLabel(team)} built a road`);
  };

  const handleUpgradeCity = (idx: number) => {
    const team = state.currentTurn as 'eagles' | 'rattlers';
    const other = team === 'eagles' ? 'rattlers' : 'eagles';
    const res = { ...state.resources[team], ore: state.resources[team].ore - 1, wheat: state.resources[team].wheat - 1, wood: state.resources[team].wood - 1, brick: state.resources[team].brick - 1 };
    const newSettlements = state.settlements.map((s, i) =>
      i === idx ? { ...s, type: 'city' as const } : s
    );
    const spotKey = state.settlements[idx].spotKey;
    let bridgeClaims = { ...state.bridgeClaims };
    let contestLog = '';
    for (const bridge of BRIDGES) {
      const myAnchor = team === 'eagles' ? bridge.eaglesSpotKey : bridge.rattlersSpotKey;
      const enemyAnchor = team === 'eagles' ? bridge.rattlersSpotKey : bridge.eaglesSpotKey;
      if (spotKey !== myAnchor) continue;
      const currentOwner = bridgeClaims[bridge.id];
      if (currentOwner === other) {
        const enemyLocked = state.settlements.some(s => s.team === other && s.spotKey === enemyAnchor && s.type === 'city');
        if (!enemyLocked) {
          bridgeClaims[bridge.id] = team;
          contestLog = `⚔️ ${teamLabel(team)} contested and claimed the ${bridge.id} bridge!`;
        } else {
          contestLog = `❌ ${teamLabel(other)} already locked the ${bridge.id} bridge with a city.`;
        }
      } else if (!currentOwner) {
        bridgeClaims[bridge.id] = team;
        contestLog = `🌉 ${teamLabel(team)} claimed the ${bridge.id} bridge!`;
      }
    }
    setState(prev => ({ ...prev, settlements: newSettlements, resources: { ...prev.resources, [team]: res }, bridgeClaims }));
    setPlacingCity(false);
    if (contestLog) addLog(contestLog);
    const vp = getVP(newSettlements, team);
    addLog(`🏙 ${teamLabel(team)} upgraded to a city (${vp} VP total)`);
  };

  const handleEndTurn = () => {
    const next = state.currentTurn === 'eagles' ? 'rattlers' : 'eagles';
    setState(prev => ({
      ...prev,
      currentTurn: next,
      turn: prev.turn + (next === 'eagles' ? 1 : 0),
      lastRoll: null,
    }));
    setPhase('roll');
    setDiceRolled(false);
    setPlacingSettlement(false); setPlacingCity(false); setPlacingRoad(false); setPlacingWatchtower(false); setRaidPhase('idle');
    addLog(`↩️ ${teamLabel(next)}'s turn begins — roll the dice!`);
  };

  const executeTrade = (give: { resource: string; amount: number }, receive: { resource: string; amount: number }) => {
    const team = state.currentTurn;
    const other = team === 'eagles' ? 'rattlers' : 'eagles';
    const teamRes = { ...state.resources[team] } as Record<string, number>;
    const otherRes = { ...state.resources[other] } as Record<string, number>;
    teamRes[give.resource] -= give.amount;
    teamRes[receive.resource] = (teamRes[receive.resource] || 0) + receive.amount;
    otherRes[receive.resource] = (otherRes[receive.resource] || 0) - receive.amount;
    otherRes[give.resource] = (otherRes[give.resource] || 0) + give.amount;
    setState(prev => ({ ...prev, resources: { ...prev.resources, [team]: teamRes, [other]: otherRes } }));
    addLog(`🤝 Trade accepted! ${give.amount}× ${give.resource} → ${receive.amount}× ${receive.resource}`);
    setBotEvaluatingTrade(false);
    setTradeResult('accepted');
    setTimeout(() => { setTradeResult(null); setTradeOpen(false); }, 1400);
  };

  const handleTrade = (give: { resource: string; amount: number }, receive: { resource: string; amount: number }) => {
    const botStock = state.resources['rattlers'][receive.resource as keyof Resources] || 0;
    const proportion = receive.amount / Math.max(botStock, 1);
    const recentlyRaided = lastRaidTurn !== null && state.turn - lastRaidTurn < 5;
    const raidPenalty = recentlyRaided ? 0.2 : 0;
    const declineChance = Math.min(0.92, 0.1 + proportion * 0.65 + raidPenalty);
    setBotEvaluatingTrade(true);
    setTimeout(() => {
      setBotEvaluatingTrade(false);
      if (Math.random() > declineChance) {
        executeTrade(give, receive);
      } else {
        const reason = recentlyRaided && Math.random() < 0.5
          ? 'still bitter about that raid'
          : `not enough ${receive.resource} to spare`;
        addLog(`🤖 🐍 Rattlers declined the trade — ${reason}`);
        setTradeResult('declined');
        setTimeout(() => { setTradeResult(null); setTradeOpen(false); }, 1400);
      }
    }, 1000 + Math.random() * 800);
  };

  const handleBuildWatchtower = () => {
    const team = state.currentTurn;
    if (!canAfford(state.resources[team], { sheep: 2 })) {
      addLog(`❌ ${teamLabel(team)} needs 🐑🐑`); return;
    }
    if (state.settlements.filter(s => s.team === team).length === 0) {
      addLog('❌ Need at least one settlement first'); return;
    }
    if (state.watchtowers.filter(w => w.team === team).length >= 5) {
      addLog(`❌ ${teamLabel(team)} already has the maximum 5 watchtowers`); return;
    }
    setPlacingWatchtower(true); setPlacingSettlement(false); setPlacingCity(false); setPlacingRoad(false);
  };

  const handlePlaceWatchtower = (spot: Spot) => {
    const team = state.currentTurn;
    const res = { ...state.resources[team], sheep: state.resources[team].sheep - 2 };
    const newWatchtower: Watchtower = { x: spot.x, y: spot.y, key: spot.key, team };
    const count = state.watchtowers.filter(w => w.team === team).length + 1;
    setState(prev => ({ ...prev, watchtowers: [...prev.watchtowers, newWatchtower], resources: { ...prev.resources, [team]: res } }));
    setPlacingWatchtower(false);
    addLog(`🗼 ${teamLabel(team)} built watchtower ${count}/5 — raids now ${count * 10}% chance of only 1 resource stolen`);
  };

  const handleCancelPlace = () => {
    setPlacingSettlement(false); setPlacingCity(false); setPlacingRoad(false); setPlacingWatchtower(false);
  };

  const canRaid = useMemo(() => {
    if (lastRaidTurn !== null && state.turn - lastRaidTurn < 4) return false;
    const team = state.currentTurn;
    const res = state.resources[team];
    const totalRes = Object.values(res).reduce((a, b) => a + b, 0);
    if (totalRes === 0) return false;
    const spotKeys = new Set(state.settlements.filter(s => s.team === team).map(s => s.spotKey));
    return BRIDGES.some(b => spotKeys.has(team === 'eagles' ? b.eaglesSpotKey : b.rattlersSpotKey));
  }, [lastRaidTurn, state.turn, state.currentTurn, state.settlements, state.resources]);

  const handleRaid = () => setRaidPhase('choosing');
  const handleCancelRaid = () => setRaidPhase('idle');

  function payRaidCost(team: 'eagles' | 'rattlers'): [Record<string, number>, string] {
    const teamRes = { ...state.resources[team] } as Record<string, number>;
    const raidCosts = (Object.entries(teamRes) as [string, number][]).filter(([, n]) => n > 0);
    const [costRes] = raidCosts[Math.floor(Math.random() * raidCosts.length)];
    teamRes[costRes] -= 1;
    return [teamRes, costRes];
  }

  const handleRaidSteal = () => {
    const team = state.currentTurn as 'eagles' | 'rattlers';
    const other = team === 'eagles' ? 'rattlers' : 'eagles';
    const [teamRes, costRes] = payRaidCost(team);
    const otherRes = { ...state.resources[other] } as Record<string, number>;

    const towerCount = state.watchtowers.filter(w => w.team === other).length;
    const cappedAtOne = towerCount > 0 && Math.random() < towerCount * 0.1;
    const ownsBothBridges = BRIDGES.every(b => (state.bridgeClaims ?? {})[b.id] === team);
    const baseSteal = ownsBothBridges ? 4 : 2;
    const stealMax = cappedAtOne ? 1 : baseSteal;

    const stolenMap: Record<string, number> = {};
    for (let i = 0; i < stealMax; i++) {
      const available = (Object.entries(otherRes) as [string, number][]).filter(([, n]) => n > 0);
      if (available.length === 0) break;
      const [r] = available[Math.floor(Math.random() * available.length)];
      stolenMap[r] = (stolenMap[r] || 0) + 1;
      otherRes[r] -= 1;
      teamRes[r] = (teamRes[r] || 0) + 1;
    }

    setState(prev => ({ ...prev, resources: { ...prev.resources, [team]: teamRes as Resources, [other]: otherRes as Resources } }));
    setLastRaidTurn(state.turn);
    setRaidPhase('idle');
    const icons: Record<string, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', ore: '⛏', wheat: '🌾' };
    const stolenStr = Object.entries(stolenMap).map(([r, n]) => `${n}×${icons[r]}`).join(' ') || 'nothing';
    const bonusStr = ownsBothBridges ? ' (🌉×2 double haul!)' : '';
    const warnStr = cappedAtOne ? ' (🗼 blocked — only 1 stolen)' : bonusStr;
    addLog(`⚔️ ${teamLabel(team)} raided! Paid 1×${icons[costRes]}, stole ${stolenStr}${warnStr}`);
  };

  const handleRaidTargetSettlement = (idx: number) => {
    const team = state.currentTurn as 'eagles' | 'rattlers';
    const other = team === 'eagles' ? 'rattlers' : 'eagles';
    const [teamRes, costRes] = payRaidCost(team);
    const target = state.settlements[idx];
    const icons: Record<string, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', ore: '⛏', wheat: '🌾' };
    let newSettlements: Settlement[];
    let logMsg: string;
    if (target.type === 'city') {
      newSettlements = state.settlements.map((s, i) => i === idx ? { ...s, type: 'settlement' as const } : s);
      logMsg = `💥 ${teamLabel(team)} destroyed a ${teamLabel(other)} city! (downgraded, -1 VP) Paid 1×${icons[costRes]}`;
    } else {
      newSettlements = state.settlements.filter((_, i) => i !== idx);
      logMsg = `💥 ${teamLabel(team)} razed a ${teamLabel(other)} settlement! (-1 VP) Paid 1×${icons[costRes]}`;
    }
    setState(prev => ({ ...prev, settlements: newSettlements, resources: { ...prev.resources, [team]: teamRes as Resources } }));
    setLastRaidTurn(state.turn);
    setRaidPhase('idle');
    addLog(logMsg);
  };

  const handleRaidTargetWatchtower = (idx: number) => {
    const team = state.currentTurn as 'eagles' | 'rattlers';
    const other = team === 'eagles' ? 'rattlers' : 'eagles';
    const [teamRes, costRes] = payRaidCost(team);
    const icons: Record<string, string> = { wood: '🌲', brick: '🧱', sheep: '🐑', ore: '⛏', wheat: '🌾' };
    const newWatchtowers = state.watchtowers.filter((_, i) => i !== idx);
    const remaining = newWatchtowers.filter(w => w.team === other).length;
    setState(prev => ({ ...prev, watchtowers: newWatchtowers, resources: { ...prev.resources, [team]: teamRes as Resources } }));
    setLastRaidTurn(state.turn);
    setRaidPhase('idle');
    addLog(`💥 ${teamLabel(team)} destroyed a ${teamLabel(other)} watchtower! (-10% raid protection, ${remaining} remain) Paid 1×${icons[costRes]}`);
  };

  const resetGame = () => {
    setState(makeInitialState());
    setPhase('roll');
    setDiceRolled(false);
    setPlacingSettlement(false); setPlacingCity(false); setPlacingRoad(false); setRaidPhase('idle');
    setLog(['⚔️ New game! Eagles move first.']);
    setWinner(null);
    setLastRaidTurn(null);
    setIsDraw(false);
    setPlacingWatchtower(false);
    setBotThinking(false);
    botRunning.current = false;
    usedWeights.current = null;
  };

  const ExitButton = (
    <button onClick={onExit} className="text-xs border border-zinc-600 text-zinc-300 px-3 py-1.5 hover:text-white hover:border-zinc-400">
      ← STORE
    </button>
  );

  if (isDraw) {
    return (
      <div className="retro-game fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.96)' }}>
        <div className="absolute top-4 left-4">{ExitButton}</div>
        <div className="text-center font-mono">
          <p style={{ fontSize: 48, marginBottom: 12 }}>🤝</p>
          <p style={{ fontSize: 11, color: '#f8b800', letterSpacing: '0.4em', marginBottom: 8 }}>★ DRAW ★</p>
          <p style={{ fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 4 }}>BOTH SIDES STARVED</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>SPLIT VALLEY REMAINS UNCLAIMED</p>
          <button onClick={resetGame} style={{ background: '#f8b800', color: '#000', border: '3px solid #fff', padding: '12px 28px', fontFamily: 'inherit', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.2em', cursor: 'pointer' }}>
            ▶ PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  if (winner) {
    return (
      <div className="retro-game fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.96)' }}>
        <div className="absolute top-4 left-4">{ExitButton}</div>
        <div className="text-center font-mono">
          <p style={{ fontSize: 56, marginBottom: 12 }}>{winner === 'eagles' ? '🦅' : '🐍'}</p>
          <p style={{ fontSize: 11, color: '#f8b800', letterSpacing: '0.4em', marginBottom: 8 }}>★ VICTORY ★</p>
          <p style={{ fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 4 }}>{teamLabel(winner)}</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>CONQUERED SPLIT VALLEY</p>
          <button
            onClick={resetGame}
            style={{ background: '#f8b800', color: '#000', border: '3px solid #fff', padding: '12px 28px', fontFamily: 'inherit', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.2em', cursor: 'pointer' }}
          >
            ▶ PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-game flex flex-col h-full" style={{ background: '#111', overflow: 'hidden' }}>
      <div className="bg-zinc-900 border-b border-zinc-700 px-4 py-1.5">{ExitButton}</div>
      <GameHUD
        state={state}
        phase={phase}
        diceRolled={diceRolled}
        placingSettlement={placingSettlement}
        placingCity={placingCity}
        placingRoad={placingRoad}
        placingWatchtower={placingWatchtower}
        eaglesVP={eaglesVP}
        rattlersVP={rattlersVP}
        botThinking={botThinking}
        mode={mode}
        onRoll={handleRoll}
        onBuildSettlement={handleBuildSettlement}
        onBuildCity={handleBuildCity}
        onBuildRoad={handleBuildRoad}
        onBuildWatchtower={handleBuildWatchtower}
        onCancelPlace={handleCancelPlace}
        onTrade={() => setTradeOpen(true)}
        onEndTurn={handleEndTurn}
        onRaid={handleRaid}
        onRaidSteal={handleRaidSteal}
        onRaidDestroy={() => setRaidPhase('targeting')}
        onCancelRaid={handleCancelRaid}
        raidPhase={raidPhase}
        tradeUnlocked={tradeUnlocked}
        canRaid={canRaid}
        raidCooldown={lastRaidTurn !== null ? Math.max(0, 4 - (state.turn - lastRaidTurn)) : 0}
      />

      <div className="flex-1 overflow-auto">
        <GameBoard
          state={state}
          placingSettlement={placingSettlement}
          onPlaceSettlement={handlePlaceSettlement}
          placingCity={placingCity}
          onUpgradeCity={handleUpgradeCity}
          placingRoad={placingRoad}
          onPlaceRoad={handlePlaceRoad}
          placingWatchtower={placingWatchtower}
          onPlaceWatchtower={handlePlaceWatchtower}
          availableSpotKeys={availableSpotKeys}
          targetingRaid={raidPhase === 'targeting'}
          onRaidTargetSettlement={handleRaidTargetSettlement}
          onRaidTargetWatchtower={handleRaidTargetWatchtower}
        />
      </div>

      <GameLog log={log} />

      {tradeOpen && (
        <TradeModal state={state} onTrade={handleTrade} onClose={() => { setTradeOpen(false); setTradeResult(null); }} botEvaluating={botEvaluatingTrade} tradeResult={tradeResult} />
      )}
    </div>
  );
}
