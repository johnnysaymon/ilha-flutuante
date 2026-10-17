import type { ControlState, Controller } from '../input/Controls';
import { decide, type AIDecision, type AIParams, type WorldView } from './brain';

/** Controla um bichinho com a mesma interface do jogador, pensando a cada "tempo de reação". */
export class AIController implements Controller {
  private decision: AIDecision | null = null;
  private nextThink = 0;
  private faceFrames = 0;

  constructor(
    private getView: () => WorldView,
    private params: AIParams,
    private rng: () => number = Math.random,
  ) {}

  get mode(): string {
    return this.decision?.mode ?? 'wait';
  }

  onRoundStart(): void {
    this.decision = null;
    this.nextThink = 0;
  }

  read(time: number): ControlState {
    const view = this.getView();
    const out: ControlState = { move: 0, jump: false, dash: false, fire: false };

    if (time >= this.nextThink) {
      this.decision = decide(view, this.params, this.rng);
      const jitter = 0.75 + this.rng() * 0.5;
      // Recuperar e desviar exige reflexo mais rápido que o normal.
      const urgent = this.decision.mode === 'recover' || this.decision.mode === 'dodge';
      this.nextThink = time + this.params.reactionMs * jitter * (urgent ? 0.5 : 1);
      out.jump = this.decision.jump;
      out.dash = this.decision.dash;
      out.fire = this.decision.fire;
      if (this.decision.face) this.faceFrames = 2;
    }

    const d = this.decision;
    if (!d) return out;

    if (this.faceFrames > 0 && d.face) {
      this.faceFrames--;
      out.move = d.face * 0.05;
      return out;
    }
    if (d.targetX != null) {
      const diff = d.targetX - view.self.x;
      const chasing = d.mode === 'chase' || d.mode === 'attack';
      const deadBand = chasing ? 4 : 14;
      if (Math.abs(diff) > deadBand) out.move = Math.sign(diff);
    }
    if (out.dash && d.face) out.move = d.face;
    return out;
  }
}
