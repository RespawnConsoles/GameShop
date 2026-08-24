export const COLS = 12;
export const ROWS = 8;
export const ENTRANCE_ROW = 2;
export const EXIT_ROW = 5;

export interface TrapDef {
  kind: "trap";
  id: string; name: string; emoji: string;
  cost: number; damage: number;
  poisonTicks?: number; poisonDmg?: number;
  description: string; unlockLevel: number;
}

export interface MonsterDef {
  kind: "monster";
  id: string; name: string; emoji: string;
  cost: number; hp: number; atk: number;
  ranged?: boolean;
  description: string; unlockLevel: number;
}

export interface BlockadeDef {
  kind: "blockade";
  id: "blockade"; name: string; emoji: string;
  cost: 0; description: string; unlockLevel: 1;
}

export type ItemDef = TrapDef | MonsterDef | BlockadeDef;

export const BLOCKADE: BlockadeDef = {
  kind: "blockade", id: "blockade", name: "Stone Wall", emoji: "🧱",
  cost: 0,
  description: "Impassable. Free, but limited per level. Use to funnel the hero.",
  unlockLevel: 1,
};

export const TRAPS: TrapDef[] = [
  { kind: "trap", id: "spike",    name: "Spike Pit",      emoji: "⚡",  cost: 1, damage: 8,
    description: "8 damage when stepped on.",                       unlockLevel: 1 },
  { kind: "trap", id: "fire",     name: "Fire Vent",      emoji: "🔥",  cost: 2, damage: 18,
    description: "18 damage. Burns.",                               unlockLevel: 2 },
  { kind: "trap", id: "blade",    name: "Blade Gauntlet", emoji: "🗡️",  cost: 2, damage: 15,
    description: "15 damage. A corridor of spinning blades.",       unlockLevel: 3 },
  { kind: "trap", id: "poison",   name: "Poison Pool",    emoji: "☠️",  cost: 2, damage: 8,
    poisonTicks: 2, poisonDmg: 8,
    description: "8 dmg + 8 poison on each of next 2 tiles.",      unlockLevel: 3 },
  { kind: "trap", id: "crusher",  name: "Crusher",        emoji: "⚙️",  cost: 3, damage: 25,
    description: "25 damage. Upgrade to make it count.",            unlockLevel: 4 },
  { kind: "trap", id: "void",     name: "Void Crack",     emoji: "🌀",  cost: 4, damage: 40,
    description: "40 damage. Upgrade to tear reality.",             unlockLevel: 6 },
  { kind: "trap", id: "lava",     name: "Lava Flow",      emoji: "🌋",  cost: 4, damage: 50,
    description: "50 damage. Melts through armor.",                 unlockLevel: 7 },
  { kind: "trap", id: "acid",     name: "Acid Vat",       emoji: "🧪",  cost: 3, damage: 8,
    poisonTicks: 3, poisonDmg: 10,
    description: "8 dmg + 10 acid on each of next 3 tiles.",       unlockLevel: 9 },
  { kind: "trap", id: "temporal", name: "Temporal Snare", emoji: "⏳",  cost: 5, damage: 70,
    description: "70 damage. Tears the hero through time itself.",  unlockLevel: 11 },
];

export const MONSTERS: MonsterDef[] = [
  { kind: "monster", id: "slime",    name: "Slime",        emoji: "🟢", cost: 2,  hp: 16,  atk: 12,
    description: "16 HP · 12 atk/rnd. Cheap blocker.",                 unlockLevel: 1 },
  { kind: "monster", id: "goblin",   name: "Goblin Horde", emoji: "👺", cost: 1,  hp: 10,  atk: 10,
    description: "10 HP · 10 atk/rnd. Dirt cheap cannon fodder.",      unlockLevel: 2 },
  { kind: "monster", id: "skeleton", name: "Skeleton",     emoji: "💀", cost: 3,  hp: 30,  atk: 14,
    description: "30 HP · 14 atk/rnd.",                                 unlockLevel: 2 },
  { kind: "monster", id: "orc",      name: "Orc Guard",    emoji: "👹", cost: 5,  hp: 55,  atk: 20,
    description: "55 HP · 20 atk/rnd. Heavy hitter.",                  unlockLevel: 3 },
  { kind: "monster", id: "mage",     name: "Dark Mage",    emoji: "🧙", cost: 6,  hp: 40,  atk: 22,
    ranged: true,
    description: "40 HP · 22 atk. Also hits from 1 tile away.",        unlockLevel: 5 },
  { kind: "monster", id: "troll",    name: "Troll",        emoji: "🪨", cost: 8,  hp: 100, atk: 32,
    description: "100 HP · 32 atk/rnd. Upgrade to threaten.",          unlockLevel: 6 },
  { kind: "monster", id: "werewolf", name: "Werewolf",     emoji: "🐺", cost: 7,  hp: 80,  atk: 35,
    description: "80 HP · 35 atk/rnd. Feral and relentless.",          unlockLevel: 7 },
  { kind: "monster", id: "dragon",   name: "Dragon",       emoji: "🐉", cost: 12, hp: 150, atk: 50,
    description: "150 HP · 50 atk/rnd. Upgrade to be legendary.",      unlockLevel: 8 },
  { kind: "monster", id: "vampire",  name: "Vampire Lord", emoji: "🧛", cost: 9,  hp: 90,  atk: 40,
    ranged: true,
    description: "90 HP · 40 atk. Strikes from the shadows.",          unlockLevel: 10 },
  { kind: "monster", id: "demon",    name: "Pit Demon",    emoji: "😈", cost: 10, hp: 120, atk: 45,
    description: "120 HP · 45 atk/rnd. Born from the dungeon itself.", unlockLevel: 11 },
  { kind: "monster", id: "giant",    name: "Stone Giant",  emoji: "🗿", cost: 14, hp: 220, atk: 60,
    description: "220 HP · 60 atk/rnd. An immovable wall of flesh.",   unlockLevel: 13 },
];

export interface ShopUpgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  costScaling: number;
  maxPurchases: number;
  category: "traps" | "monsters" | "dungeon";
  effect: {
    type: "trap_dmg" | "monster_hp" | "monster_atk" | "poison_ticks" | "extra_budget" | "extra_walls";
    target?: string;
    amount: number;
  };
}

export const SHOP_UPGRADES: ShopUpgrade[] = [
  // Traps
  { id: "spike_dmg",    name: "Razor Spikes",    emoji: "⚡",  category: "traps",    baseCost: 100, costScaling: 1.5, maxPurchases: 4, description: "+10 dmg to Spike Pits",          effect: { type: "trap_dmg",     target: "spike",    amount: 10 } },
  { id: "fire_dmg",     name: "Inferno Vent",    emoji: "🔥",  category: "traps",    baseCost: 130, costScaling: 1.5, maxPurchases: 4, description: "+15 dmg to Fire Vents",          effect: { type: "trap_dmg",     target: "fire",     amount: 15 } },
  { id: "blade_dmg",    name: "Razor Gauntlet",  emoji: "🗡️",  category: "traps",    baseCost: 110, costScaling: 1.5, maxPurchases: 4, description: "+12 dmg to Blade Gauntlets",     effect: { type: "trap_dmg",     target: "blade",    amount: 12 } },
  { id: "poison_ticks", name: "Vile Toxin",      emoji: "☠️",  category: "traps",    baseCost: 120, costScaling: 1.8, maxPurchases: 2, description: "+1 tile to Poison duration",     effect: { type: "poison_ticks", target: "poison",   amount: 1  } },
  { id: "crusher_dmg",  name: "Heavy Crusher",   emoji: "⚙️",  category: "traps",    baseCost: 180, costScaling: 1.5, maxPurchases: 4, description: "+20 dmg to Crushers",            effect: { type: "trap_dmg",     target: "crusher",  amount: 20 } },
  { id: "void_dmg",     name: "Void Expansion",  emoji: "🌀",  category: "traps",    baseCost: 220, costScaling: 1.6, maxPurchases: 4, description: "+30 dmg to Void Cracks",         effect: { type: "trap_dmg",     target: "void",     amount: 30 } },
  { id: "lava_dmg",     name: "Super Heated",    emoji: "🌋",  category: "traps",    baseCost: 210, costScaling: 1.5, maxPurchases: 4, description: "+25 dmg to Lava Flow",           effect: { type: "trap_dmg",     target: "lava",     amount: 25 } },
  { id: "acid_ticks",   name: "Potent Acid",     emoji: "🧪",  category: "traps",    baseCost: 150, costScaling: 1.8, maxPurchases: 2, description: "+1 tile to Acid duration",       effect: { type: "poison_ticks", target: "acid",     amount: 1  } },
  { id: "temporal_dmg", name: "Time Shatter",    emoji: "⏳",  category: "traps",    baseCost: 300, costScaling: 1.6, maxPurchases: 4, description: "+40 dmg to Temporal Snares",     effect: { type: "trap_dmg",     target: "temporal", amount: 40 } },
  // Monsters
  { id: "slime_hp",     name: "Mega Slime",      emoji: "🟢",  category: "monsters", baseCost: 80,  costScaling: 1.4, maxPurchases: 4, description: "+20 HP to Slimes",               effect: { type: "monster_hp",   target: "slime",    amount: 20 } },
  { id: "goblin_atk",   name: "Goblin Rage",     emoji: "👺",  category: "monsters", baseCost: 70,  costScaling: 1.4, maxPurchases: 4, description: "+8 ATK to Goblin Hordes",        effect: { type: "monster_atk",  target: "goblin",   amount: 8  } },
  { id: "skeleton_atk", name: "Bone Blades",     emoji: "💀",  category: "monsters", baseCost: 110, costScaling: 1.5, maxPurchases: 4, description: "+12 ATK to Skeletons",           effect: { type: "monster_atk",  target: "skeleton", amount: 12 } },
  { id: "orc_hp",       name: "Iron Armor",      emoji: "👹",  category: "monsters", baseCost: 150, costScaling: 1.5, maxPurchases: 4, description: "+30 HP to Orcs",                 effect: { type: "monster_hp",   target: "orc",      amount: 30 } },
  { id: "mage_atk",     name: "Dark Grimoire",   emoji: "🧙",  category: "monsters", baseCost: 170, costScaling: 1.5, maxPurchases: 4, description: "+15 ATK to Dark Mages",          effect: { type: "monster_atk",  target: "mage",     amount: 15 } },
  { id: "troll_hp",     name: "Troll Rage",      emoji: "🪨",  category: "monsters", baseCost: 200, costScaling: 1.5, maxPurchases: 4, description: "+50 HP to Trolls",               effect: { type: "monster_hp",   target: "troll",    amount: 50 } },
  { id: "werewolf_hp",  name: "Alpha Wolf",      emoji: "🐺",  category: "monsters", baseCost: 210, costScaling: 1.5, maxPurchases: 4, description: "+40 HP to Werewolves",           effect: { type: "monster_hp",   target: "werewolf", amount: 40 } },
  { id: "dragon_atk",   name: "Hellfire",        emoji: "🐉",  category: "monsters", baseCost: 280, costScaling: 1.6, maxPurchases: 4, description: "+30 ATK to Dragons",             effect: { type: "monster_atk",  target: "dragon",   amount: 30 } },
  { id: "vampire_atk",  name: "Blood Frenzy",    emoji: "🧛",  category: "monsters", baseCost: 260, costScaling: 1.5, maxPurchases: 4, description: "+20 ATK to Vampire Lords",       effect: { type: "monster_atk",  target: "vampire",  amount: 20 } },
  { id: "demon_hp",     name: "Infernal Form",   emoji: "😈",  category: "monsters", baseCost: 250, costScaling: 1.5, maxPurchases: 4, description: "+45 HP to Pit Demons",           effect: { type: "monster_hp",   target: "demon",    amount: 45 } },
  { id: "giant_hp",     name: "Titan Skin",      emoji: "🗿",  category: "monsters", baseCost: 320, costScaling: 1.5, maxPurchases: 4, description: "+70 HP to Stone Giants",         effect: { type: "monster_hp",   target: "giant",    amount: 70 } },
  // Dungeon
  { id: "extra_budget", name: "Deep Pockets",    emoji: "💰",  category: "dungeon",  baseCost: 150, costScaling: 1.8, maxPurchases: 6, description: "+3 budget every level",          effect: { type: "extra_budget", amount: 3 } },
  { id: "extra_walls",  name: "Stoneworks",      emoji: "🏗️",  category: "dungeon",  baseCost: 100, costScaling: 1.6, maxPurchases: 6, description: "+5 wall limit every level",      effect: { type: "extra_walls",  amount: 5 } },
];

export interface LevelConfig {
  level: number; budget: number; wallLimit: number;
  heroHP: number; heroAtk: number; heroArmor: number;
  newUnlocks: string[];
}

export const LEVELS: LevelConfig[] = [
  { level: 1,  budget: 8,  wallLimit: 5, heroHP: 65,  heroAtk: 15, heroArmor: 0,  newUnlocks: ["spike", "slime"] },
  { level: 2,  budget: 12, wallLimit: 5, heroHP: 90,  heroAtk: 20, heroArmor: 0,  newUnlocks: ["fire", "skeleton", "goblin"] },
  { level: 3,  budget: 15, wallLimit: 4, heroHP: 120, heroAtk: 25, heroArmor: 0,  newUnlocks: ["poison", "orc", "blade"] },
  { level: 4,  budget: 19, wallLimit: 4, heroHP: 150, heroAtk: 30, heroArmor: 10, newUnlocks: ["crusher"] },
  { level: 5,  budget: 23, wallLimit: 3, heroHP: 185, heroAtk: 35, heroArmor: 10, newUnlocks: ["mage"] },
  { level: 6,  budget: 28, wallLimit: 3, heroHP: 225, heroAtk: 40, heroArmor: 20, newUnlocks: ["void", "troll"] },
  { level: 7,  budget: 33, wallLimit: 2, heroHP: 275, heroAtk: 45, heroArmor: 20, newUnlocks: ["lava", "werewolf"] },
  { level: 8,  budget: 39, wallLimit: 2, heroHP: 335, heroAtk: 50, heroArmor: 30, newUnlocks: ["dragon"] },
  { level: 9,  budget: 45, wallLimit: 2, heroHP: 400, heroAtk: 55, heroArmor: 30, newUnlocks: ["acid"] },
  { level: 10, budget: 53, wallLimit: 2, heroHP: 475, heroAtk: 65, heroArmor: 40, newUnlocks: ["vampire"] },
  { level: 11, budget: 62, wallLimit: 1, heroHP: 560, heroAtk: 75, heroArmor: 40, newUnlocks: ["temporal", "demon"] },
  { level: 12, budget: 72, wallLimit: 1, heroHP: 650, heroAtk: 85, heroArmor: 45, newUnlocks: [] },
  { level: 13, budget: 84, wallLimit: 1, heroHP: 750, heroAtk: 95, heroArmor: 45, newUnlocks: ["giant"] },
  { level: 14, budget: 98, wallLimit: 1, heroHP: 875, heroAtk: 108, heroArmor: 50, newUnlocks: [] },
  { level: 15, budget: 114, wallLimit: 1, heroHP: 1000, heroAtk: 125, heroArmor: 50, newUnlocks: [] },
];
