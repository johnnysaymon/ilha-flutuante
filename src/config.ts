export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const GRAVITY = 1500;

export const PHYS = {
  runSpeed: 270,
  groundAccel: 2400,
  airAccel: 1400,
  groundFriction: 2200,
  stunFriction: 260,
  jumpVelocity: 640,
  airJumps: 1,
  dashSpeed: 600,
  dashTime: 170,
  dashCooldown: 850,
  maxFall: 900,
};

export const BUMP = {
  /** Velocidade mínima de aproximação para contar como empurrão "de verdade". */
  minPower: 60,
  base: 260,
  powerScale: 0.75,
  dashBonus: 260,
  lift: 230,
  recoil: 120,
  separation: 170,
  /** Quanto cada ponto de tontura (%) aumenta o empurrão. */
  dizzyScale: 1 / 85,
  baseDamage: 5,
  damagePerPower: 1 / 45,
  dashDamage: 6,
  cooldownMs: 260,
  hitstunMs: 230,
};

export const BLAST_ZONE = { left: -220, right: GAME_WIDTH + 220, bottom: GAME_HEIGHT + 120, top: -900 };

export const ROUNDS_TO_WIN = 2;

export const CHEST = {
  minDelay: 7000,
  maxDelay: 11000,
  lifetime: 15000,
};

export type CharacterId = 'bolota' | 'pipoca';

export const CHARACTERS: Record<CharacterId, { name: string; color: number; css: string; species: string }> = {
  bolota: { name: 'Bolota', color: 0xe8a35c, css: '#e8a35c', species: 'hamster' },
  pipoca: { name: 'Pipoca', color: 0xf7d6e0, css: '#f29bb8', species: 'coelhinha' },
};

export type Difficulty = 'facil' | 'normal' | 'dificil';
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};

export type MatchMode = 'cpu' | 'versus';
export type TouchScheme = 'motion' | 'buttons';

export interface MatchSettings {
  mode: MatchMode;
  difficulty: Difficulty;
  touchScheme: TouchScheme | null;
}

/** Geometria da ilha (topo de cada superfície, em coordenadas do jogo). */
export interface Surface {
  left: number;
  right: number;
  top: number;
  oneWay: boolean;
}

export const ISLAND: Surface = { left: 230, right: 1050, top: 520, oneWay: false };
export const PLATFORMS: Surface[] = [
  { left: 320, right: 500, top: 400, oneWay: true },
  { left: 780, right: 960, top: 400, oneWay: true },
  { left: 565, right: 715, top: 285, oneWay: true },
];
export const CLOUD = { width: 130, top: 175, minX: 360, maxX: 920, speed: 70 };

export const SPAWN_X: Record<CharacterId, number> = { bolota: 420, pipoca: 860 };
