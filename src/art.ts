import Phaser from 'phaser';
import type { CharacterId } from './config';

/** Toda a arte é desenhada por código e transformada em texturas na inicialização. */

export const INK = 0x3b2a4a;
export const CRITTER_TEX = { w: 40, h: 46, feetY: 44 };
export type Face = 'idle' | 'blink' | 'hurt' | 'happy';
export const FACES: Face[] = ['idle', 'blink', 'hurt', 'happy'];

export const critterKey = (id: CharacterId, face: Face) => `${id}-${face}`;

type G = Phaser.GameObjects.Graphics;

function eyes(g: G, face: Face, lx: number, rx: number, y: number) {
  g.lineStyle(1.6, 0x2b1d2e, 1);
  switch (face) {
    case 'idle':
      for (const x of [lx, rx]) {
        g.fillStyle(0x2b1d2e, 1).fillCircle(x, y, 2.9);
        g.fillStyle(0xffffff, 1).fillCircle(x - 0.9, y - 1.1, 1.1);
        g.fillStyle(0xffffff, 0.7).fillCircle(x + 1, y + 1, 0.5);
      }
      break;
    case 'blink':
      for (const x of [lx, rx]) {
        g.beginPath();
        g.arc(x, y - 0.5, 2.4, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
        g.strokePath();
      }
      break;
    case 'happy':
      for (const x of [lx, rx]) {
        g.beginPath();
        g.arc(x, y + 1.5, 2.6, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
        g.strokePath();
      }
      break;
    case 'hurt':
      g.lineBetween(lx - 2.4, y - 2.2, lx + 2, y);
      g.lineBetween(lx - 2.4, y + 2.2, lx + 2, y);
      g.lineBetween(rx + 2.4, y - 2.2, rx - 2, y);
      g.lineBetween(rx + 2.4, y + 2.2, rx - 2, y);
      break;
  }
}

function mouth(g: G, face: Face, x: number, y: number) {
  g.lineStyle(1.1, 0x2b1d2e, 1);
  if (face === 'hurt') {
    g.fillStyle(0x7a2f45, 1).fillEllipse(x, y + 1.2, 3.2, 2.6);
    return;
  }
  g.beginPath();
  g.arc(x - 1.2, y, 1.2, 0, Math.PI);
  g.strokePath();
  g.beginPath();
  g.arc(x + 1.2, y, 1.2, 0, Math.PI);
  g.strokePath();
}

function drawHamster(g: G, face: Face) {
  const fur = 0xe8a35c;
  const furDark = 0xc9813f;
  const cream = 0xfff1da;
  g.lineStyle(1.6, INK, 1);
  // orelhas
  for (const [x, y] of [[11, 20], [28, 19]]) {
    g.fillStyle(fur, 1).fillCircle(x, y, 4.8).strokeCircle(x, y, 4.8);
    g.fillStyle(0xf4a6b5, 1).fillCircle(x, y, 2.6);
  }
  // pezinhos
  g.fillStyle(furDark, 1);
  g.fillEllipse(14, 43, 8, 4).strokeEllipse(14, 43, 8, 4);
  g.fillEllipse(26, 43, 8, 4).strokeEllipse(26, 43, 8, 4);
  // corpo bolinha
  g.fillStyle(fur, 1).fillEllipse(20, 31, 31, 25).strokeEllipse(20, 31, 31, 25);
  g.fillStyle(furDark, 0.35).fillEllipse(12, 26, 9, 6);
  g.fillStyle(cream, 1).fillEllipse(23, 34.5, 18, 14);
  // mãozinhas
  g.fillStyle(fur, 1).fillEllipse(19, 37, 5, 4).strokeEllipse(19, 37, 5, 4);
  g.fillStyle(fur, 1).fillEllipse(28, 37, 5, 4).strokeEllipse(28, 37, 5, 4);
  // rosto (3/4 virado para a direita)
  g.fillStyle(0xff8fa8, 0.55).fillEllipse(14, 32, 5, 3).fillEllipse(32, 32, 5, 3);
  eyes(g, face, 18, 27, 27.5);
  g.fillStyle(0xe86a8a, 1).fillEllipse(23.5, 31, 3.4, 2.4);
  mouth(g, face, 23.5, 32.4);
  // bigodinhos
  g.lineStyle(0.7, INK, 0.6);
  g.lineBetween(30, 31, 35, 30).lineBetween(30, 32.5, 35, 33);
}

function drawBunny(g: G, face: Face) {
  const fur = 0xfbf6f1;
  const shade = 0xe9dcd6;
  const pink = 0xf4a6b5;
  g.lineStyle(1.6, INK, 1);
  // rabinho pompom
  g.fillStyle(fur, 1).fillCircle(5.5, 34, 4.3).strokeCircle(5.5, 34, 4.3);
  // orelhas compridas
  for (const [x, y] of [[15, 11], [25, 10]]) {
    g.fillStyle(fur, 1).fillEllipse(x, y, 7.5, 21).strokeEllipse(x, y, 7.5, 21);
    g.fillStyle(pink, 1).fillEllipse(x, y + 1, 3.6, 14);
  }
  // florzinha na orelha
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillStyle(0xff7aa8, 1).fillCircle(28.5 + Math.cos(a) * 2.4, 4 + Math.sin(a) * 2.4, 1.9);
  }
  g.fillStyle(0xffe066, 1).fillCircle(28.5, 4, 1.4);
  // pezinhos
  g.lineStyle(1.6, INK, 1);
  g.fillStyle(shade, 1);
  g.fillEllipse(14, 43, 9, 4).strokeEllipse(14, 43, 9, 4);
  g.fillEllipse(26, 43, 9, 4).strokeEllipse(26, 43, 9, 4);
  // corpo
  g.fillStyle(fur, 1).fillEllipse(20, 32, 29, 23).strokeEllipse(20, 32, 29, 23);
  g.fillStyle(shade, 0.6).fillEllipse(11, 36, 8, 8);
  g.fillStyle(fur, 1).fillEllipse(20, 38, 5, 4).strokeEllipse(20, 38, 5, 4);
  g.fillStyle(fur, 1).fillEllipse(28, 38, 5, 4).strokeEllipse(28, 38, 5, 4);
  // rosto
  g.fillStyle(0xff8fa8, 0.6).fillEllipse(14.5, 33, 5, 3).fillEllipse(32, 33, 5, 3);
  eyes(g, face, 18.5, 27, 28.5);
  g.fillStyle(0xff7aa8, 1).fillEllipse(23.5, 32, 3, 2.2);
  mouth(g, face, 23.5, 33.3);
}

function star(g: G, cx: number, cy: number, outer: number, inner: number, points = 5) {
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.fillPoints(pts, true);
}

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function generateTextures(scene: Phaser.Scene) {
  for (const face of FACES) {
    make(scene, critterKey('bolota', face), CRITTER_TEX.w, CRITTER_TEX.h, (g) => drawHamster(g, face));
    make(scene, critterKey('pipoca', face), CRITTER_TEX.w, CRITTER_TEX.h, (g) => drawBunny(g, face));
  }

  const chest = (open: boolean) => (g: G) => {
    g.lineStyle(2, INK, 1);
    g.fillStyle(0xb06a3b, 1).fillRoundedRect(3, 16, 32, 18, 3).strokeRoundedRect(3, 16, 32, 18, 3);
    g.fillStyle(0x8a4f2a, 1).fillRect(5, 26, 28, 2);
    if (open) {
      g.fillStyle(0xfff3a0, 0.9).fillEllipse(19, 15, 26, 10);
      g.fillStyle(0xc77b45, 1).fillRoundedRect(4, 1, 30, 9, 3).strokeRoundedRect(4, 1, 30, 9, 3);
    } else {
      g.fillStyle(0xc77b45, 1).fillRoundedRect(2, 7, 34, 12, { tl: 8, tr: 8, bl: 2, br: 2 });
      g.strokeRoundedRect(2, 7, 34, 12, { tl: 8, tr: 8, bl: 2, br: 2 });
      g.fillStyle(0xffd34d, 1).fillRect(16, 7, 6, 27);
      g.fillStyle(0xffd34d, 1).fillRoundedRect(14.5, 15, 9, 9, 2).strokeRoundedRect(14.5, 15, 9, 9, 2);
      g.fillStyle(INK, 1).fillCircle(19, 19, 1.4);
    }
  };
  make(scene, 'chest', 38, 36, chest(false));
  make(scene, 'chest-open', 38, 36, chest(true));

  make(scene, 'p-vento', 34, 24, (g) => {
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath().arc(13, 12, 8, Math.PI * 0.6, Math.PI * 2.1).strokePath();
    g.lineStyle(3, 0x9fe3ff, 1);
    g.beginPath().arc(13, 12, 4, Math.PI * 0.2, Math.PI * 1.8).strokePath();
    g.lineStyle(2.5, 0xffffff, 0.9);
    g.lineBetween(20, 5, 33, 5).lineBetween(22, 12, 33, 12).lineBetween(20, 19, 31, 19);
  });
  make(scene, 'p-bolha', 30, 30, (g) => {
    g.fillStyle(0xb8f0ff, 0.35).fillCircle(15, 15, 13);
    g.lineStyle(2, 0xffffff, 0.95).strokeCircle(15, 15, 13);
    g.fillStyle(0xffffff, 0.9).fillEllipse(10, 9, 6, 4);
    g.fillStyle(0xff9ff3, 0.35).fillEllipse(20, 21, 6, 3);
  });
  make(scene, 'p-bomba', 24, 24, (g) => {
    g.lineStyle(1.5, INK, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0xff8fb8 : 0xffb3cf, 1);
      g.fillCircle(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 5);
      g.strokeCircle(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 5);
    }
    g.fillStyle(0xffe066, 1).fillCircle(12, 12, 4.5).strokeCircle(12, 12, 4.5);
  });
  make(scene, 'p-banana', 28, 18, (g) => {
    g.lineStyle(1.6, INK, 1);
    g.fillStyle(0xffe066, 1);
    g.fillTriangle(4, 15, 10, 3, 14, 15).strokeTriangle(4, 15, 10, 3, 14, 15);
    g.fillTriangle(14, 15, 18, 3, 24, 15).strokeTriangle(14, 15, 18, 3, 24, 15);
    g.fillStyle(0xffd23f, 1).fillEllipse(14, 14, 16, 7).strokeEllipse(14, 14, 16, 7);
    g.fillStyle(0x7a5230, 1).fillCircle(14, 12, 1.6);
  });

  make(scene, 'spark', 12, 12, (g) => {
    g.fillStyle(0xffffff, 1);
    star(g, 6, 6, 6, 1.6, 4);
  });
  make(scene, 'petal', 8, 6, (g) => g.fillStyle(0xffffff, 1).fillEllipse(4, 3, 8, 5));
  make(scene, 'dot', 8, 8, (g) => g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4));
  make(scene, 'star', 18, 18, (g) => {
    g.fillStyle(0xffd34d, 1);
    star(g, 9, 9, 8.5, 3.8);
    g.lineStyle(1.4, INK, 1).strokePoints(
      Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? 8.5 : 3.8;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        return { x: 9 + Math.cos(a) * r, y: 9 + Math.sin(a) * r };
      }),
      true,
    );
  });
  make(scene, 'star-empty', 18, 18, (g) => {
    g.fillStyle(0xffffff, 0.45);
    star(g, 9, 9, 8.5, 3.8);
  });
  make(scene, 'cloud', 180, 70, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(45, 42, 26).fillCircle(85, 30, 30).fillCircle(125, 40, 25).fillCircle(150, 50, 17);
    g.fillRoundedRect(25, 40, 140, 28, 14);
  });
}
