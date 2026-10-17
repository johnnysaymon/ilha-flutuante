import Phaser from 'phaser';
import { CHARACTERS, GAME_HEIGHT, GAME_WIDTH, type CharacterId, type MatchSettings } from '../config';
import { critterKey } from '../art';
import { bake, drawFarIslets, drawIsland, driftClouds, makeBackdrop, type DriftingCloud } from '../world';
import { drawSky, makeButton, textStyle } from '../ui';

interface ResultData {
  winner: CharacterId;
  score: Record<CharacterId, number>;
  settings: MatchSettings;
}

export class ResultScene extends Phaser.Scene {
  private clouds: DriftingCloud[] = [];

  constructor() {
    super('Result');
  }

  create(data: ResultData) {
    bake(this, [drawSky(this, GAME_WIDTH, GAME_HEIGHT), drawFarIslets(this)], -100);
    this.clouds = makeBackdrop(this, GAME_WIDTH, GAME_HEIGHT);
    const winner = CHARACTERS[data.winner];
    const loserId: CharacterId = data.winner === 'bolota' ? 'pipoca' : 'bolota';

    const vsCpu = data.settings.mode === 'cpu';
    const headline = vsCpu ? (data.winner === 'bolota' ? 'Você venceu!' : 'O computador venceu!') : `${winner.name} venceu!`;
    const title = this.add
      .text(GAME_WIDTH / 2, 110, headline, textStyle(80, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 12 }))
      .setOrigin(0.5)
      .setScale(0.3);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });
    this.add
      .text(GAME_WIDTH / 2, 185, `${winner.name} ficou na ilha  •  ${data.score.bolota} × ${data.score.pipoca}`, textStyle(28))
      .setOrigin(0.5);

    const island = { left: 455, right: 825, top: 470, oneWay: false };
    bake(this, drawIsland(this, island, 1, 11), 1);
    const champ = this.add.image(GAME_WIDTH / 2, island.top + 1, critterKey(data.winner, 'happy')).setOrigin(0.5, 44 / 46).setScale(3).setDepth(5);
    this.tweens.add({ targets: champ, y: island.top - 50, duration: 360, yoyo: true, repeat: -1, ease: 'Quad.Out' });

    // o perdedor flutua numa nuvenzinha, dizendo "da próxima vez..."
    const cloud = this.add.image(1080, 320, 'cloud').setScale(0.6).setDepth(4);
    const sad = this.add.image(1080, 312, critterKey(loserId, 'hurt')).setOrigin(0.5, 44 / 46).setScale(1.6).setDepth(5);
    this.tweens.add({ targets: [cloud, sad], y: '-=12', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add.particles(GAME_WIDTH / 2, -20, 'petal', {
      x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
      speedY: { min: 80, max: 180 },
      speedX: { min: -40, max: 40 },
      rotate: { min: 0, max: 360 },
      scale: { min: 1, max: 2 },
      tint: [0xff8fb8, 0xffd34d, 0x9fe3ff, 0xb48cff, 0xffffff],
      lifespan: 6000,
      frequency: 60,
    }).setDepth(20);

    makeButton(this, GAME_WIDTH / 2 - 190, 640, 'Jogar de novo', () => this.scene.start('Game', data.settings), { width: 320 }).setDepth(10);
    makeButton(this, GAME_WIDTH / 2 + 190, 640, 'Menu', () => this.scene.start('Menu'), { width: 320, fill: 0x9fe3ff }).setDepth(10);
  }

  update(_t: number, delta: number) {
    driftClouds(this.clouds, delta / 1000, GAME_WIDTH);
  }
}
