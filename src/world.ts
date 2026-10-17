import Phaser from 'phaser';
import type { Surface } from './config';
import { INK } from './art';

/** Desenha uma ilha/plataforma flutuante com o gramado exatamente em `s.top`. */
export function drawIsland(scene: Phaser.Scene, s: Surface, depth: number, seed = 1) {
  const rnd = new Phaser.Math.RandomDataGenerator([String(seed)]);
  const g = scene.add.graphics().setDepth(depth);
  const w = s.right - s.left;
  const cx = (s.left + s.right) / 2;
  const big = w > 400;
  const depthPx = big ? 210 : 46;
  const top = s.top;

  // parte de baixo (terra e pedra), afinando em ponta
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: s.left - 4, y: top + 8 }];
  const steps = big ? 9 : 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = s.left + t * w;
    const curve = Math.sin(t * Math.PI);
    const jag = big ? rnd.realInRange(-12, 12) : rnd.realInRange(-3, 3);
    pts.push({ x, y: top + 12 + curve * depthPx + jag });
  }
  pts.push({ x: s.right + 4, y: top + 8 });
  g.fillStyle(0x9b6b4a, 1).fillPoints(pts, true);
  g.lineStyle(3, INK, 1).strokePoints(pts, true);

  // camadas de terra
  g.lineStyle(3, 0x7d5338, 0.8);
  for (let layer = 1; layer <= (big ? 3 : 1); layer++) {
    const yy = top + 12 + layer * (depthPx / 4.2);
    const half = (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow((yy - top - 12) / (depthPx + 8), 2))) * 0.85;
    g.beginPath();
    g.moveTo(cx - half, yy);
    for (let x = cx - half; x <= cx + half; x += 30) g.lineTo(x, yy + Math.sin(x * 0.05 + layer) * 3);
    g.strokePath();
  }
  // pedrinhas
  for (let i = 0; i < (big ? 14 : 2); i++) {
    const x = cx + rnd.realInRange(-w * 0.35, w * 0.35);
    const maxDepth = Math.sin((1 - Math.abs(x - cx) / (w / 2)) * Math.PI * 0.5) * depthPx * 0.8;
    const y = top + 24 + rnd.realInRange(0, Math.max(4, maxDepth));
    g.fillStyle(rnd.pick([0x8a8f9c, 0xa4a9b6, 0x7d5338]), 1).fillEllipse(x, y, rnd.between(8, 18), rnd.between(6, 11));
  }
  if (big) {
    // raízes penduradas
    g.lineStyle(2.5, 0x5f8f3a, 1);
    for (let i = 0; i < 6; i++) {
      const x = s.left + 40 + rnd.realInRange(0, w - 80);
      const len = rnd.between(20, 45);
      g.beginPath();
      g.moveTo(x, top + 14);
      g.lineTo(x + rnd.between(-6, 6), top + 14 + len);
      g.strokePath();
      g.fillStyle(0x6fcf6a, 1).fillCircle(x, top + 14 + len, 3);
    }
  }

  // gramado
  const gh = big ? 22 : 14;
  g.fillStyle(0x4fae4f, 1).fillRoundedRect(s.left - 8, top - 2, w + 16, gh + 4, gh / 2);
  for (let x = s.left; x <= s.right; x += big ? 22 : 16) {
    g.fillCircle(x, top + gh, big ? 8 : 5);
  }
  g.fillStyle(0x6fcf6a, 1).fillRoundedRect(s.left - 8, top - 4, w + 16, gh, gh / 2);
  g.lineStyle(3, INK, 1).strokeRoundedRect(s.left - 8, top - 4, w + 16, gh, gh / 2);
  g.fillStyle(0xffffff, 0.3).fillRoundedRect(s.left + 6, top - 1, w - 12, 4, 2);

  // florzinhas e tufos
  const deco = scene.add.graphics().setDepth(depth + 1);
  const count = big ? 16 : 3;
  for (let i = 0; i < count; i++) {
    const x = s.left + 12 + rnd.realInRange(0, w - 24);
    if (rnd.frac() < 0.55) {
      deco.lineStyle(1.5, 0x3f8f3f, 1).lineBetween(x, top - 3, x, top - 10);
      const c = rnd.pick([0xff8fb8, 0xffffff, 0xffe066, 0xb48cff]);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        deco.fillStyle(c, 1).fillCircle(x + Math.cos(a) * 2.6, top - 12 + Math.sin(a) * 2.6, 2.1);
      }
      deco.fillStyle(0xffc23d, 1).fillCircle(x, top - 12, 1.6);
    } else {
      deco.lineStyle(2, 0x3f8f3f, 1);
      deco.lineBetween(x, top - 3, x - 3, top - 9).lineBetween(x, top - 3, x, top - 11).lineBetween(x, top - 3, x + 3, top - 9);
    }
  }
  return [g, deco];
}

/** Arvorezinha decorativa (atrás dos personagens). */
export function drawTree(scene: Phaser.Scene, x: number, groundY: number, depth: number) {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(0x8a5a3a, 1).fillRoundedRect(x - 6, groundY - 46, 12, 46, 4);
  g.lineStyle(2.5, INK, 1).strokeRoundedRect(x - 6, groundY - 46, 12, 46, 4);
  g.fillStyle(0x58b85a, 1);
  g.fillCircle(x - 18, groundY - 56, 20).fillCircle(x + 18, groundY - 58, 20).fillCircle(x, groundY - 76, 24);
  g.lineStyle(2.5, INK, 1);
  g.strokeCircle(x - 18, groundY - 56, 20).strokeCircle(x + 18, groundY - 58, 20).strokeCircle(x, groundY - 76, 24);
  g.fillStyle(0x58b85a, 1).fillCircle(x - 18, groundY - 56, 18.5).fillCircle(x + 18, groundY - 58, 18.5).fillCircle(x, groundY - 76, 22.5);
  g.fillStyle(0xff6b7a, 1).fillCircle(x - 14, groundY - 66, 3.5).fillCircle(x + 12, groundY - 80, 3.5).fillCircle(x + 22, groundY - 54, 3.5);
  g.fillStyle(0xffffff, 0.25).fillCircle(x - 6, groundY - 86, 9);
  return g;
}

/**
 * Desenhos vetoriais (Graphics) são redesenhados a cada quadro; o cenário que não se mexe
 * é "assado" numa textura só, o que deixa o jogo leve no celular.
 */
export function bake(scene: Phaser.Scene, objects: Phaser.GameObjects.GameObject[], depth: number) {
  const rt = scene.add.renderTexture(0, 0, scene.scale.width, scene.scale.height).setOrigin(0).setDepth(depth);
  rt.draw(objects);
  objects.forEach((o) => o.destroy());
  return rt;
}

export function drawFarIslets(scene: Phaser.Scene) {
  // ilhotas distantes
  const g = scene.add.graphics();
  for (const [x, y, s] of [[110, 300, 0.5], [1180, 420, 0.4], [200, 640, 0.35]] as const) {
    g.fillStyle(0xb9a3c9, 0.55).fillEllipse(x, y, 120 * s * 2, 26 * s * 2);
    g.fillTriangle(x - 110 * s, y, x + 110 * s, y, x, y + 120 * s);
    g.fillStyle(0xa8e0b0, 0.6).fillEllipse(x, y - 6 * s, 124 * s * 2, 16 * s * 2);
  }
  return g;
}

export interface DriftingCloud {
  img: Phaser.GameObjects.Image;
  speed: number;
}

export function makeBackdrop(scene: Phaser.Scene, w: number, h: number): DriftingCloud[] {
  const clouds: DriftingCloud[] = [];
  for (let i = 0; i < 7; i++) {
    const far = i < 4;
    const img = scene.add
      .image(Phaser.Math.Between(0, w), Phaser.Math.Between(40, h - 120), 'cloud')
      .setAlpha(far ? 0.45 : 0.75)
      .setScale(far ? Phaser.Math.FloatBetween(0.5, 0.8) : Phaser.Math.FloatBetween(0.9, 1.3))
      .setDepth(far ? -90 : -80);
    clouds.push({ img, speed: far ? Phaser.Math.FloatBetween(6, 12) : Phaser.Math.FloatBetween(14, 24) });
  }
  return clouds;
}

export function driftClouds(clouds: DriftingCloud[], dt: number, w: number) {
  for (const c of clouds) {
    c.img.x += c.speed * dt;
    if (c.img.x - c.img.displayWidth / 2 > w) c.img.x = -c.img.displayWidth / 2;
  }
}
