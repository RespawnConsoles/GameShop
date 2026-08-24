import type { ComponentType } from 'react';
import { ConsoleDrop } from './console-drop/ConsoleDrop';
import { PowerSurge } from './power-surge/PowerSurge';
import { ConsoleClicker } from './console-clicker/ConsoleClicker';
import { DungeonArchitect } from './dungeon-architect/DungeonArchitect';
import { MazeDash } from './maze-dash/MazeDash';
import { SplitValleyGame } from './split-valley/SplitValleyGame';
import { IframeGame } from './IframeGame';

export interface PlayableGameProps {
  onExit: () => void;
  paused: boolean;
}

export const PLAYABLE_GAMES: Record<string, ComponentType<PlayableGameProps>> = {
  'console-drop': ConsoleDrop,
  'power-surge': PowerSurge,
  'console-clicker': ConsoleClicker,
  'dungeon-architect': DungeonArchitect,
  'maze-dash': MazeDash,
  'split-valley': SplitValleyGame,
  'game-2048': (props) => <IframeGame src="oss-games/2048/index.html" onExit={props.onExit} />,
  'game-tetris': (props) => <IframeGame src="oss-games/tetris/index.html" onExit={props.onExit} />,
};
