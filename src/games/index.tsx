import type { ComponentType } from 'react';
import { ConsoleDrop } from './console-drop/ConsoleDrop';
import { PowerSurge } from './power-surge/PowerSurge';
import { ConsoleClicker } from './console-clicker/ConsoleClicker';
import { DungeonArchitect } from './dungeon-architect/DungeonArchitect';
import { SplitValleyGame } from './split-valley/SplitValleyGame';

export interface PlayableGameProps {
  onExit: () => void;
}

export const PLAYABLE_GAMES: Record<string, ComponentType<PlayableGameProps>> = {
  'console-drop': ConsoleDrop,
  'power-surge': PowerSurge,
  'console-clicker': ConsoleClicker,
  'dungeon-architect': DungeonArchitect,
  'split-valley': SplitValleyGame,
};
