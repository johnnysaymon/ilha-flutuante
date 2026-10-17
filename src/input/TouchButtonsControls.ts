import Phaser from 'phaser';
import type { ControlState, Controller } from './Controls';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

interface Button {
  id: 'left' | 'right' | 'jump' | 'fire';
  x: number;
  y: number;
  r: number;
  gfx: Phaser.GameObjects.Container;
}

/** Alternativa sem giroscópio: botões grandes na tela, com suporte a multitoque. */
export class TouchButtonsControls implements Controller {
  readonly fireDashesWhenEmpty = true;
  private buttons: Button[] = [];
  private prev = { jump: false, fire: false };

  constructor(private scene: Phaser.Scene) {
    scene.input.addPointer(3);
    const y = GAME_HEIGHT - 95;
    const defs: Array<[Button['id'], number, number, string]> = [
      ['left', 105, y, '◀'],
      ['right', 245, y, '▶'],
      ['fire', GAME_WIDTH - 245, y, '✦'],
      ['jump', GAME_WIDTH - 105, y - 20, '▲'],
    ];
    for (const [id, x, by, label] of defs) {
      const r = id === 'jump' ? 66 : 58;
      const circle = scene.add.circle(0, 0, r, 0xffffff, 0.28).setStrokeStyle(4, 0x3b2a4a, 0.35);
      const text = scene.add
        .text(0, 0, label, { fontFamily: 'system-ui, sans-serif', fontSize: '42px', color: '#3b2a4a' })
        .setOrigin(0.5)
        .setAlpha(0.6);
      const gfx = scene.add.container(x, by, [circle, text]).setDepth(900).setScrollFactor(0);
      this.buttons.push({ id, x, y: by, r: r + 16, gfx });
    }
  }

  private held(id: Button['id']): boolean {
    const b = this.buttons.find((btn) => btn.id === id)!;
    const pointers = this.scene.input.manager.pointers;
    return pointers.some((p) => p.isDown && Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r);
  }

  read(): ControlState {
    const left = this.held('left');
    const right = this.held('right');
    const jump = this.held('jump');
    const fire = this.held('fire');
    for (const b of this.buttons) b.gfx.setScale(this.held(b.id) ? 0.92 : 1);
    const state: ControlState = {
      move: (right ? 1 : 0) - (left ? 1 : 0),
      jump: jump && !this.prev.jump,
      dash: false,
      fire: fire && !this.prev.fire,
    };
    this.prev = { jump, fire };
    return state;
  }

  destroy(): void {
    for (const b of this.buttons) b.gfx.destroy();
  }
}
