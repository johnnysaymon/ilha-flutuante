import Phaser from 'phaser';
import type { ControlState, Controller } from './Controls';

export interface KeyMap {
  left: string[];
  right: string[];
  jump: string[];
  dash: string[];
  fire: string[];
}

export const KEYS_SOLO: KeyMap = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  jump: ['UP', 'W'],
  dash: ['SHIFT', 'DOWN', 'S'],
  fire: ['SPACE', 'F', 'ENTER'],
};
export const KEYS_P1: KeyMap = { left: ['A'], right: ['D'], jump: ['W'], dash: ['S'], fire: ['F'] };
export const KEYS_P2: KeyMap = { left: ['LEFT'], right: ['RIGHT'], jump: ['UP'], dash: ['DOWN'], fire: ['ENTER'] };

type Keys = Record<keyof KeyMap, Phaser.Input.Keyboard.Key[]>;

export class KeyboardControls implements Controller {
  private keys: Keys;

  constructor(scene: Phaser.Scene, map: KeyMap) {
    const kb = scene.input.keyboard!;
    const make = (names: string[]) => names.map((n) => kb.addKey(n, true));
    this.keys = {
      left: make(map.left),
      right: make(map.right),
      jump: make(map.jump),
      dash: make(map.dash),
      fire: make(map.fire),
    };
  }

  read(): ControlState {
    const down = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => k.isDown);
    const pressed = (ks: Phaser.Input.Keyboard.Key[]) =>
      ks.map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);
    return {
      move: (down(this.keys.right) ? 1 : 0) - (down(this.keys.left) ? 1 : 0),
      jump: pressed(this.keys.jump),
      dash: pressed(this.keys.dash),
      fire: pressed(this.keys.fire),
    };
  }
}
