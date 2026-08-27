import consoleDrop from '../assets/games/consoledrop.png';
import powerSurge from '../assets/games/powersurge.svg';
import consoleClicker from '../assets/games/consoleclicker.svg';
import splitValley from '../assets/games/splitvalley.svg';
import dungeonArchitect from '../assets/games/dungeonarchitect.svg';
import mazeDash from '../assets/games/mazedash.svg';
import game2048 from '../assets/games/2048.svg';
import gameTetris from '../assets/games/tetris.svg';
import communityPlaceholder from '../assets/games/community-placeholder.svg';
import type { UploadedGame } from './types';

export interface CatalogGame {
  id: string;
  title: string;
  description: string;
  genre: string;
  group: string;
  maker: string;
  color: string;
  image: string;
  price: number;
}

/** Bundled with the app — pulled from the Respawn Consoles RC Game Store. No network needed. */
export const CATALOG: CatalogGame[] = [
  {
    id: 'console-drop',
    title: 'CONSOLE DROP',
    description: 'Catch falling consoles before they hit the ground. How high can you score?',
    genre: 'Arcade',
    group: 'Classics',
    maker: 'Respawn Studios',
    color: '#00b800',
    image: consoleDrop,
    price: 0,
  },
  {
    id: 'power-surge',
    title: 'POWER SURGE',
    description: 'Dodge lightning bolts and blast alien invaders, ghosts, and dragons. How long can you survive?',
    genre: 'Shooter',
    group: 'Classics',
    maker: 'Respawn Studios',
    color: '#f8b800',
    image: powerSurge,
    price: 0,
  },
  {
    id: 'console-clicker',
    title: 'CONSOLE CLICKER',
    description: 'Click your way to a massive console empire. Buy hardware, earn credits, unlock upgrades.',
    genre: 'Idle',
    group: 'Classics',
    maker: 'Respawn Studios',
    color: '#d82800',
    image: consoleClicker,
    price: 0,
  },
  {
    id: 'maze-dash',
    title: 'MAZE DASH',
    description: 'Race a randomly generated maze to the exit, grabbing coins along the way. Six levels, each bigger than the last.',
    genre: 'Arcade',
    group: 'Classics',
    maker: 'Respawn Studios',
    color: '#60a5fa',
    image: mazeDash,
    price: 0,
  },
  {
    id: 'split-valley',
    title: 'SPLIT VALLEY',
    description: 'Two teams clash over resources in a hex-based strategy game. Trade, build, and conquer. First to 7 victory points wins.',
    genre: 'Strategy',
    group: 'Board Games',
    maker: 'Respawn Studios × Anonymous Creator',
    color: '#7c3aed',
    image: splitValley,
    price: 0.99,
  },
  {
    id: 'dungeon-architect',
    title: 'DUNGEON ARCHITECT',
    description: 'Design the deadliest dungeon you can. Place traps and monsters to stop the hero from escaping. Unlock new tools each level.',
    genre: 'Strategy',
    group: 'Creativity',
    maker: 'Respawn Studios',
    color: '#c084fc',
    image: dungeonArchitect,
    price: 0.99,
  },
  {
    id: 'game-2048',
    title: '2048',
    description: 'Slide numbered tiles to combine matching pairs. Reach the 2048 tile to win — keep going for a higher score after that.',
    genre: 'Puzzle',
    group: 'Open Source',
    maker: 'Gabriele Cirulli (MIT License)',
    color: '#f2b179',
    image: game2048,
    price: 0,
  },
  {
    id: 'game-tetris',
    title: 'TETRIS',
    description: 'The classic falling-block puzzle. Clear lines by filling every gap across a row before the stack reaches the top.',
    genre: 'Puzzle',
    group: 'Open Source',
    maker: 'Jake Gordon (MIT License)',
    color: '#38bdf8',
    image: gameTetris,
    price: 0,
  },
];

/**
 * A game belongs to a studio only if the studio's name genuinely appears in the
 * game's `maker` credit (e.g. "Respawn Studios" matches "Respawn Studios × Anonymous
 * Creator"). This is the only path a game can end up linked to a studio — there is
 * no manual "claim any game" flow, so a studio can't attribute someone else's work
 * to itself just by asking.
 */
export function gameBelongsToStudio(game: CatalogGame, studioName: string): boolean {
  const name = studioName.trim();
  if (name.length < 3) return false;
  return game.maker.toLowerCase().includes(name.toLowerCase());
}

export function gamesForStudio(studioName: string): CatalogGame[] {
  return CATALOG.filter((g) => gameBelongsToStudio(g, studioName));
}

/** Shapes an approved community upload into the same shape the store/library/player expect. */
export function uploadedGameToCatalogGame(game: UploadedGame, studioName: string): CatalogGame {
  return {
    id: game.id,
    title: game.title,
    description: game.description || 'A community-uploaded game.',
    genre: 'Community',
    group: 'Community',
    maker: studioName,
    color: '#38bdf8',
    image: communityPlaceholder,
    price: 0,
  };
}
