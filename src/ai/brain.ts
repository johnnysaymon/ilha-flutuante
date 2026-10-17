import type { Difficulty, Surface } from '../config';
import type { PowerId } from '../powers/powers';

/** Visão simplificada do mundo para a IA (sem dependência do Phaser, para ser testável). */
export interface AgentView {
  x: number;
  /** Altura dos pés (y cresce para baixo). */
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  airJumpsLeft: number;
  canDash: boolean;
  facing: 1 | -1;
  power: PowerId | null;
  trapped: boolean;
  stunned: boolean;
}

export interface WorldView {
  self: AgentView;
  foe: AgentView;
  chest: { x: number; y: number } | null;
  /** Projéteis do adversário. */
  threats: Array<{ x: number; y: number; vx: number; vy: number }>;
  /** Cascas de banana do adversário. */
  traps: Array<{ x: number; y: number }>;
  island: Surface;
  platforms: Surface[];
}

export interface AIParams {
  reactionMs: number;
  /** Diferença de altura tolerada para mirar projéteis retos. */
  aimTolerance: number;
  dashChance: number;
  fireChance: number;
  edgeMargin: number;
  mistakeChance: number;
  dodgeChance: number;
}

export const AI_PRESETS: Record<Difficulty, AIParams> = {
  facil: { reactionMs: 430, aimTolerance: 18, dashChance: 0.2, fireChance: 0.45, edgeMargin: 40, mistakeChance: 0.12, dodgeChance: 0.25 },
  normal: { reactionMs: 240, aimTolerance: 28, dashChance: 0.45, fireChance: 0.75, edgeMargin: 70, mistakeChance: 0.04, dodgeChance: 0.6 },
  dificil: { reactionMs: 120, aimTolerance: 34, dashChance: 0.7, fireChance: 0.95, edgeMargin: 95, mistakeChance: 0, dodgeChance: 0.9 },
};

export type AIMode = 'recover' | 'dodge' | 'edge' | 'fire' | 'chest' | 'chase' | 'attack' | 'wander' | 'wait';

export interface AIDecision {
  targetX: number | null;
  /** Virar para este lado sem andar (para mirar). */
  face: 1 | -1 | null;
  jump: boolean;
  dash: boolean;
  fire: boolean;
  mode: AIMode;
}

const none = (mode: AIMode, targetX: number | null = null): AIDecision => ({
  targetX,
  face: null,
  jump: false,
  dash: false,
  fire: false,
  mode,
});

function surfaceUnder(x: number, y: number, surfaces: Surface[]): Surface | null {
  let best: Surface | null = null;
  for (const s of surfaces) {
    if (x >= s.left - 4 && x <= s.right + 4 && Math.abs(s.top - y) < 24) {
      if (!best || s.top < best.top) best = s;
    }
  }
  return best;
}

export function decide(view: WorldView, p: AIParams, rng: () => number = Math.random): AIDecision {
  const { self: s, foe: f, island: isl } = view;
  const center = (isl.left + isl.right) / 2;

  if (s.trapped || s.stunned) return none('wait', center);

  // 1. Recuperação: fora da ilha, volta para o centro usando pulo duplo e investida.
  const offStage = s.x < isl.left - 4 || s.x > isl.right + 4;
  if (offStage) {
    const d = none('recover', center);
    const nearestEdge = s.x < isl.left ? isl.left : isl.right;
    const falling = s.vy > 40;
    d.jump = falling && s.airJumpsLeft > 0 && s.y > isl.top - 70;
    d.dash =
      !d.jump && falling && s.canDash && s.airJumpsLeft === 0 && Math.abs(s.x - nearestEdge) < 280 && s.y > isl.top - 40;
    if (d.dash) d.face = s.x < center ? 1 : -1;
    return d;
  }

  if (rng() < p.mistakeChance) {
    return none('wander', isl.left + rng() * (isl.right - isl.left));
  }

  const dx = f.x - s.x;
  const dy = f.y - s.y;
  const dirToFoe: 1 | -1 = dx >= 0 ? 1 : -1;
  const safeLeft = isl.left + p.edgeMargin * 0.6;
  const safeRight = isl.right - p.edgeMargin * 0.6;
  const clampSafe = (x: number) => Math.min(safeRight, Math.max(safeLeft, x));

  // 2. Desviar de projéteis vindo na direção da IA.
  for (const t of view.threats) {
    const tdx = s.x - t.x;
    const coming = Math.sign(t.vx) === Math.sign(tdx) || Math.abs(tdx) < 30;
    if (coming && Math.abs(tdx) < 230 && Math.abs(t.y - (s.y - 16)) < 46 && s.onGround && rng() < p.dodgeChance) {
      const d = none('dodge', s.x);
      d.jump = true;
      return d;
    }
  }

  // 3. Pular cascas de banana no caminho.
  for (const t of view.traps) {
    const ahead = (t.x - s.x) * Math.sign(s.vx || s.facing);
    if (ahead > 0 && ahead < 70 && Math.abs(t.y - s.y) < 20 && s.onGround) {
      const d = none('dodge', s.x + Math.sign(s.vx || s.facing) * 80);
      d.jump = true;
      return d;
    }
  }

  // 4. Encurralado na borda: volta ao centro, pulando por cima do adversário se preciso.
  const distToEdge = Math.min(s.x - isl.left, isl.right - s.x);
  const foeTowardCenter = Math.sign(center - s.x) === Math.sign(dx);
  if (distToEdge < p.edgeMargin && s.onGround && s.y >= isl.top - 4) {
    const d = none('edge', center);
    if (foeTowardCenter && Math.abs(dx) < 130) d.jump = true;
    return d;
  }

  // 5. Usar poderes.
  if (s.power && rng() < p.fireChance) {
    const facingFoe = s.facing === dirToFoe;
    const adx = Math.abs(dx);
    let wants = false;
    switch (s.power) {
      case 'vento':
      case 'bolha':
        wants = Math.abs(dy) < p.aimTolerance && adx > 40 && adx < 580 && !f.trapped;
        break;
      case 'bomba':
        wants = adx > 110 && adx < 470 && dy > -90;
        break;
      case 'banana': {
        const foeApproaching = f.vx * -dirToFoe > 50;
        wants = Math.abs(dy) < 30 && adx < 280 && foeApproaching;
        break;
      }
    }
    if (wants) {
      if (s.power === 'banana') {
        // A casca cai atrás de quem solta: fique de costas para o adversário.
        const d = none('fire', s.x);
        if (s.facing === dirToFoe) d.face = dirToFoe === 1 ? -1 : 1;
        else d.fire = true;
        return d;
      }
      const d = none('fire', s.x);
      if (facingFoe) d.fire = true;
      else d.face = dirToFoe;
      return d;
    }
  }

  // 6. Escolher objetivo: baú (se não tem poder ou está bem perto) ou o adversário.
  let goal: { x: number; y: number } = f;
  let mode: AIMode = 'chase';
  if (view.chest) {
    const dChest = Math.hypot(view.chest.x - s.x, view.chest.y - s.y);
    const dFoe = Math.hypot(dx, dy);
    if (!s.power || dChest < dFoe * 0.6) {
      goal = view.chest;
      mode = 'chest';
    }
  }

  const surfaces = [isl, ...view.platforms];
  const d = none(mode, goal === f ? clampSafe(goal.x) : goal.x);

  // 7. Navegação vertical.
  if (goal.y < s.y - 40) {
    const target = surfaceUnder(goal.x, goal.y, surfaces);
    if (target) {
      const under = s.x >= target.left - 10 && s.x <= target.right + 10;
      if (under && s.onGround) d.jump = true;
      else if (under && !s.onGround && s.vy > -60 && s.y > target.top && s.airJumpsLeft > 0) d.jump = true;
      else if (!under) d.targetX = Math.min(target.right - 15, Math.max(target.left + 15, goal.x));
    }
  } else if (goal.y > s.y + 40 && s.onGround) {
    const here = surfaceUnder(s.x, s.y, surfaces);
    if (here && here.oneWay && goal.x >= here.left && goal.x <= here.right) {
      // Desce pela ponta mais próxima da plataforma.
      d.targetX = s.x - here.left < here.right - s.x ? here.left - 25 : here.right + 25;
    }
  }

  // 8. Ataque: investida quando está perto e alinhado; evita ficar entre o adversário e a borda.
  if (mode === 'chase') {
    const selfOuter = Math.abs(s.x - center) > Math.abs(f.x - center) && Math.sign(s.x - center) === Math.sign(f.x - center);
    if (selfOuter && Math.abs(dx) < 140 && Math.abs(dy) < 30 && s.onGround && distToEdge < 220) {
      d.jump = true; // pula por cima para empurrar em direção à borda
      d.mode = 'edge';
    } else if (Math.abs(dx) < 120 && Math.abs(dy) < 30 && s.canDash && rng() < p.dashChance) {
      d.mode = 'attack';
      if (s.facing === dirToFoe) d.dash = true;
      else d.face = dirToFoe;
    }
  }

  return d;
}
