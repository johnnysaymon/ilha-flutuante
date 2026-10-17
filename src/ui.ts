import Phaser from 'phaser';
import { INK } from './art';
import { sfx } from './audio/sfx';

export const FONT = '"Baloo 2", "Trebuchet MS", system-ui, sans-serif';

export function textStyle(size: number, color = '#3b2a4a', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold', ...extra };
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  fill?: number;
  fontSize?: number;
}

/** Botão arredondado e "fofinho". Dispara no pointerup (gesto válido para permissões/tela cheia). */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
) {
  const w = opts.width ?? 340;
  const h = opts.height ?? 64;
  const fill = opts.fill ?? 0xffd34d;
  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    g.clear();
    g.fillStyle(INK, 0.25).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2);
    g.lineStyle(3, INK, 1).strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + 14, -h / 2 + 7 + (pressed ? 4 : 0), w - 28, h * 0.22, h * 0.11);
  };
  draw(false);
  const text = scene.add.text(0, -2, label, textStyle(opts.fontSize ?? 26)).setOrigin(0.5);
  const c = scene.add.container(x, y, [g, text]);
  c.setSize(w, h + 6);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => c.setScale(1.04));
  c.on('pointerout', () => {
    c.setScale(1);
    draw(false);
    text.y = -2;
  });
  c.on('pointerdown', () => {
    draw(true);
    text.y = 2;
  });
  c.on('pointerup', () => {
    draw(false);
    text.y = -2;
    sfx.unlock();
    sfx.click();
    onClick();
  });
  return Object.assign(c, {
    setLabel: (s: string) => text.setText(s),
  });
}

export function drawSky(scene: Phaser.Scene, w: number, h: number) {
  const g = scene.add.graphics().setDepth(-100);
  g.fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xfde2f3, 0xfde2f3, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0xfff6c9, 0.6).fillCircle(w - 170, 120, 70);
  g.fillStyle(0xfff3a0, 1).fillCircle(w - 170, 120, 48);
  return g;
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
}
