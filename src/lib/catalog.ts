import consoleDrop from '../assets/games/consoledrop.png';
import powerSurge from '../assets/games/powersurge.svg';
import consoleClicker from '../assets/games/consoleclicker.svg';
import splitValley from '../assets/games/splitvalley.svg';
import dungeonArchitect from '../assets/games/dungeonarchitect.svg';

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
];
