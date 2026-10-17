export type PowerId = 'vento' | 'bolha' | 'bomba' | 'banana';

export interface PowerDef {
  id: PowerId;
  name: string;
  charges: number;
  /** Chave da textura do ícone/projétil gerada na BootScene. */
  texture: string;
  color: number;
  description: string;
}

export const POWERS: Record<PowerId, PowerDef> = {
  vento: {
    id: 'vento',
    name: 'Rajada de Vento',
    charges: 3,
    texture: 'p-vento',
    color: 0x9fe3ff,
    description: 'Sopro em linha reta que empurra forte.',
  },
  bolha: {
    id: 'bolha',
    name: 'Bolha',
    charges: 2,
    texture: 'p-bolha',
    color: 0xb8f0ff,
    description: 'Prende o adversário flutuando e indefeso.',
  },
  bomba: {
    id: 'bomba',
    name: 'Bomba de Pétalas',
    charges: 2,
    texture: 'p-bomba',
    color: 0xff8fb8,
    description: 'Arremesso em arco que explode em pétalas.',
  },
  banana: {
    id: 'banana',
    name: 'Casca de Banana',
    charges: 2,
    texture: 'p-banana',
    color: 0xffe066,
    description: 'Deixe no chão: quem pisar escorrega!',
  },
};

export const POWER_IDS = Object.keys(POWERS) as PowerId[];

export const POWER_TUNING = {
  vento: { speed: 640, life: 1300, force: 430, lift: 200, damage: 10 },
  bolha: { speed: 400, life: 1700, trapMs: 1500, damage: 6 },
  bomba: { vx: 430, vy: -470, life: 1700, radius: 120, force: 560, damage: 14 },
  banana: { life: 11000, slide: 560, stunMs: 800, damage: 8 },
};
