import { BUMP } from '../config';

export interface BumpBody {
  x: number;
  vx: number;
  dashing: boolean;
  dizzy: number;
  /** Presos numa bolha ficam mais fáceis de empurrar. */
  trapped?: boolean;
}

export interface BumpImpulse {
  vx: number;
  vy: number;
  damage: number;
  stunned: boolean;
}

export interface BumpResult {
  a: BumpImpulse;
  b: BumpImpulse;
  /** Quem empurrou: 'a', 'b' ou null quando foi só um encostão. */
  winner: 'a' | 'b' | null;
}

export function knockbackScale(dizzy: number, trapped = false): number {
  return (1 + Math.max(0, dizzy) * BUMP.dizzyScale) * (trapped ? 1.5 : 1);
}

/** Força com que `body` avança na direção do outro (só conta aproximação). */
export function approachPower(body: BumpBody, towardSign: number): number {
  const speed = Math.max(0, body.vx * towardSign);
  return speed + (body.dashing ? BUMP.dashBonus : 0);
}

/**
 * Resolve o encontro entre dois bichinhos: quem chega com mais força empurra o outro;
 * se ninguém tem força suficiente, os dois só se afastam de leve.
 */
export function resolveBump(a: BumpBody, b: BumpBody): BumpResult {
  const dir = Math.sign(b.x - a.x) || 1; // de A para B
  const powerA = approachPower(a, dir);
  const powerB = approachPower(b, -dir);

  if (Math.max(powerA, powerB) < BUMP.minPower) {
    return {
      a: { vx: -dir * BUMP.separation, vy: 0, damage: 0, stunned: false },
      b: { vx: dir * BUMP.separation, vy: 0, damage: 0, stunned: false },
      winner: null,
    };
  }

  const aWins = powerA >= powerB;
  const attacker = aWins ? a : b;
  const victim = aWins ? b : a;
  const pushDir = aWins ? dir : -dir;
  const power = Math.abs(powerA - powerB) * 0.35 + Math.max(powerA, powerB) * 0.65;

  const scale = knockbackScale(victim.dizzy, victim.trapped);
  const force = (BUMP.base + power * BUMP.powerScale) * scale;
  const damage = Math.round(
    BUMP.baseDamage + power * BUMP.damagePerPower + (attacker.dashing ? BUMP.dashDamage : 0),
  );

  const hit: BumpImpulse = {
    vx: pushDir * force,
    vy: -BUMP.lift * Math.min(scale, 2.2),
    damage,
    stunned: true,
  };
  const recoil: BumpImpulse = { vx: -pushDir * BUMP.recoil, vy: -60, damage: 0, stunned: false };

  return aWins
    ? { a: recoil, b: hit, winner: 'a' }
    : { a: hit, b: recoil, winner: 'b' };
}

/** Empurrão radial de uma explosão (bomba de pétalas). Retorna null se fora do raio. */
export function blastImpulse(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  radius: number,
  force: number,
  dizzy: number,
): { vx: number; vy: number } | null {
  const dx = tx - cx;
  const dy = ty - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) return null;
  const falloff = 0.55 + 0.45 * (1 - dist / radius);
  const scale = knockbackScale(dizzy) * falloff * force;
  const nx = dist < 1 ? 0 : dx / dist;
  // Sempre joga um pouco para cima, para o alvo "voar".
  const ny = Math.min(-0.45, dist < 1 ? -1 : dy / dist);
  const len = Math.hypot(nx, ny) || 1;
  return { vx: (nx / len) * scale, vy: (ny / len) * scale };
}
