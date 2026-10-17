/** Utilitários puros para transformar os sensores do celular em comandos. */

export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

/**
 * Inclinação lateral ("volante") em graus, considerando a orientação da tela.
 * Em retrato é o gamma; em paisagem o eixo lateral do jogador vira o beta do aparelho.
 */
export function lateralTilt(beta: number, gamma: number, screenAngle: number): number {
  switch (((Math.round(screenAngle / 90) * 90) % 360 + 360) % 360) {
    case 90:
      return beta;
    case 180:
      return -gamma;
    case 270:
      return -beta;
    default:
      return gamma;
  }
}

/** Converte inclinação (relativa à posição calibrada) em eixo -1..1 com zona morta. */
export function tiltToAxis(tiltDeg: number, deadZone = 4, maxTilt = 18): number {
  const t = normalizeAngle(tiltDeg);
  const mag = Math.abs(t);
  if (mag <= deadZone) return 0;
  const v = Math.min(1, (mag - deadZone) / (maxTilt - deadZone));
  return Math.sign(t) * v;
}

/**
 * Velocidade de rotação (°/s) no eixo "frente/trás" do jogador, usada para o pulo.
 * Em paisagem esse eixo é o gamma do giroscópio; em retrato, o beta.
 */
export function pitchRate(rate: { alpha: number; beta: number; gamma: number }, screenAngle: number): number {
  const a = ((Math.round(screenAngle / 90) * 90) % 360 + 360) % 360;
  return a === 90 || a === 270 ? rate.gamma : rate.beta;
}

export interface JumpDetectorOptions {
  /** Giro rápido (°/s) que conta como "puxão" para pular. */
  rateThreshold: number;
  /** Aceleração linear (m/s², sem gravidade) que também conta como puxão. */
  accelThreshold: number;
  cooldownMs: number;
}

/** Detecta o gesto de pulo: um puxão/giro rápido do celular, com tempo de recarga. */
export class JumpDetector {
  private lastJump = -Infinity;
  constructor(private opts: JumpDetectorOptions = { rateThreshold: 170, accelThreshold: 13, cooldownMs: 380 }) {}

  sample(timeMs: number, pitchRateDeg: number, linearAccel: number): boolean {
    if (timeMs - this.lastJump < this.opts.cooldownMs) return false;
    if (Math.abs(pitchRateDeg) >= this.opts.rateThreshold || linearAccel >= this.opts.accelThreshold) {
      this.lastJump = timeMs;
      return true;
    }
    return false;
  }
}
