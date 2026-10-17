/** Estado de comando produzido a cada quadro — igual para teclado, celular e IA. */
export interface ControlState {
  /** -1 (esquerda) .. 1 (direita). */
  move: number;
  /** Verdadeiro só no quadro em que o pulo foi pedido. */
  jump: boolean;
  dash: boolean;
  fire: boolean;
}

export interface Controller {
  read(time: number): ControlState;
  /** Chamado no início de cada rodada (ex.: calibrar o giroscópio). */
  onRoundStart?(): void;
  /** Em telas de toque, "disparar" sem poder vira investida. */
  fireDashesWhenEmpty?: boolean;
  destroy?(): void;
}

export const IDLE: ControlState = { move: 0, jump: false, dash: false, fire: false };
