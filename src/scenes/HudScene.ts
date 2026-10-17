import Phaser from 'phaser';
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT, ROUNDS_TO_WIN } from '../config';
import { INK, critterKey } from '../art';
import { POWERS } from '../powers/powers';
import type { GameScene } from './GameScene';
import type { Critter } from '../entities/Critter';
import { makeButton, textStyle } from '../ui';
import { sfx } from '../audio/sfx';

interface Card {
  critter: Critter;
  stars: Phaser.GameObjects.Image[];
  dizzy: Phaser.GameObjects.Text;
  powerIcon: Phaser.GameObjects.Image;
  powerText: Phaser.GameObjects.Text;
  lastDizzy: number;
  lastPower: string;
}

export class HudScene extends Phaser.Scene {
  private match!: GameScene;
  private cards: Card[] = [];
  private banner!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private pauseLayer!: Phaser.GameObjects.Container;

  constructor() {
    super('Hud');
  }

  init(data: { game: GameScene }) {
    this.match = data.game;
    this.cards = [];
  }

  create() {
    this.match.critters.forEach((c, i) => this.cards.push(this.makeCard(c, i === 0 ? 'left' : 'right')));

    this.banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, '', textStyle(72, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 10 }))
      .setOrigin(0.5)
      .setAlpha(0);
    this.bannerSub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36 + 62, '', textStyle(30, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 7 }))
      .setOrigin(0.5)
      .setAlpha(0);

    const ge = this.match.events;
    const onBanner = (text: string, ms: number, sub?: string) => this.showBanner(text, ms, sub);
    const onPaused = (p: boolean) => this.pauseLayer.setVisible(p);
    ge.on('banner', onBanner);
    ge.on('paused', onPaused);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ge.off('banner', onBanner);
      ge.off('paused', onPaused);
    });

    // botão de pausa
    const pauseBtn = this.add.container(GAME_WIDTH / 2, 40);
    const circle = this.add.circle(0, 0, 24, 0xffffff, 0.85).setStrokeStyle(3, INK);
    const bars = this.add.text(0, -1, 'II', textStyle(22)).setOrigin(0.5);
    pauseBtn.add([circle, bars]).setSize(56, 56).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => {
      sfx.click();
      this.match.togglePause();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.match.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.match.togglePause());

    this.buildPauseLayer();
    this.showHint();

    if (this.match.settings.touchScheme === 'motion') {
      this.time.delayedCall(2600, () => {
        if (this.match.motion && !this.match.motion.hasSensorData) {
          this.match.switchToButtons();
          this.showBanner('Sem giroscópio', 2200, 'Usando botões na tela');
        }
      });
    }
  }

  private makeCard(c: Critter, side: 'left' | 'right'): Card {
    const w = 290;
    const h = 92;
    const x = side === 'left' ? 18 : GAME_WIDTH - 18 - w;
    const y = 14;
    const flip = side === 'right';
    // O fundo do cartão vira textura: Graphics seria redesenhado a cada quadro.
    const key = `hud-card-${side}-${c.id}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({}, false);
      const cx = flip ? w - 44 + 2 : 44 + 2;
      g.fillStyle(INK, 0.25).fillRoundedRect(2, 7, w, h, 22);
      g.fillStyle(0xffffff, 0.9).fillRoundedRect(2, 2, w, h, 22);
      g.lineStyle(3, INK, 1).strokeRoundedRect(2, 2, w, h, 22);
      g.fillStyle(CHARACTERS[c.id].color, 1).fillCircle(cx, 2 + h / 2, 32);
      g.lineStyle(3, INK, 1).strokeCircle(cx, 2 + h / 2, 32);
      g.generateTexture(key, w + 4, h + 10);
      g.destroy();
    }
    this.add.image(x - 2, y - 2, key).setOrigin(0);

    const faceX = flip ? x + w - 44 : x + 44;
    this.add.image(faceX, y + h / 2 + 6, critterKey(c.id, 'idle')).setScale(1.25).setFlipX(flip);

    const tx = flip ? x + w - 90 : x + 90;
    const ox = flip ? 1 : 0;
    this.add.text(tx, y + 10, c.name, textStyle(24)).setOrigin(ox, 0);
    const stars = Array.from({ length: ROUNDS_TO_WIN }, (_, i) =>
      this.add.image(tx + (flip ? -1 : 1) * (10 + i * 22), y + 49, 'star-empty'),
    );
    const dizzy = this.add.text(flip ? x + 22 : x + w - 22, y + 12, '0%', textStyle(30)).setOrigin(flip ? 0 : 1, 0);
    const powerIcon = this.add.image(tx + (flip ? -1 : 1) * 10, y + 74, 'p-vento').setScale(0.75).setVisible(false);
    const powerText = this.add.text(tx + (flip ? -1 : 1) * 26, y + 74, '', textStyle(16)).setOrigin(flip ? 1 : 0, 0.5);
    return { critter: c, stars, dizzy, powerIcon, powerText, lastDizzy: -1, lastPower: '' };
  }

  private buildPauseLayer() {
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3b2a4a, 0.55).setOrigin(0).setInteractive();
    const title = this.add.text(GAME_WIDTH / 2, 190, 'Pausado', textStyle(64, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 10 })).setOrigin(0.5);
    const items: Phaser.GameObjects.GameObject[] = [dim, title];
    let y = 300;
    items.push(makeButton(this, GAME_WIDTH / 2, y, 'Continuar', () => this.match.togglePause()));
    y += 86;
    if (this.match.settings.touchScheme === 'motion') {
      items.push(
        makeButton(this, GAME_WIDTH / 2, y, 'Recalibrar giroscópio', () => {
          this.match.motion?.calibrate();
          this.match.togglePause();
        }, { fill: 0x9fe3ff }),
      );
      y += 86;
    }
    items.push(
      makeButton(this, GAME_WIDTH / 2, y, 'Voltar ao menu', () => {
        this.scene.stop('Game');
        this.scene.start('Menu');
      }, { fill: 0xffb3cf }),
    );
    this.pauseLayer = this.add.container(0, 0, items).setDepth(1000).setVisible(false);
  }

  private showHint() {
    const s = this.match.settings;
    let text: string;
    if (s.touchScheme === 'motion') text = 'Incline o celular para andar • Dê um puxão rápido para pular • Toque para usar o poder';
    else if (s.touchScheme === 'buttons') text = '◀ ▶ andar • ▲ pular • ✦ poder (sem poder: investida)';
    else if (s.mode === 'versus') text = 'Bolota: A D andar • W pular • S investida • F poder        Pipoca: ← → • ↑ • ↓ • Enter';
    else text = '← → andar • ↑ pular (2× no ar) • Shift investida • Espaço poder • Esc pausa';
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, text, textStyle(20, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 5 }))
      .setOrigin(0.5);
    if (s.touchScheme === 'buttons') hint.setY(GAME_HEIGHT - 190);
    this.tweens.add({ targets: hint, alpha: 0, delay: 6500, duration: 800, onComplete: () => hint.destroy() });
  }

  showBanner(text: string, ms: number, sub?: string) {
    this.tweens.killTweensOf([this.banner, this.bannerSub]);
    this.banner.setText(text).setAlpha(1).setScale(0.4);
    this.bannerSub.setText(sub ?? '').setAlpha(sub ? 1 : 0);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 260, ease: 'Back.Out' });
    this.tweens.add({ targets: [this.banner, this.bannerSub], alpha: 0, delay: ms, duration: 250 });
  }

  update() {
    for (const card of this.cards) {
      const c = card.critter;
      const wins = this.match.score[c.id];
      card.stars.forEach((s, i) => s.setTexture(i < wins ? 'star' : 'star-empty'));
      const d = Math.round(c.dizzy);
      if (d === card.lastDizzy && card.lastPower === `${c.power}${c.charges}`) continue;
      card.dizzy.setText(`${d}%`);
      const heat = Math.min(1, d / 150);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x3b2a4a),
        Phaser.Display.Color.ValueToColor(0xe0365a),
        100,
        heat * 100,
      );
      card.dizzy.setColor(Phaser.Display.Color.RGBToString(col.r, col.g, col.b));
      if (d > card.lastDizzy) {
        card.dizzy.setScale(1.35);
        this.tweens.add({ targets: card.dizzy, scale: 1, duration: 200 });
      }
      card.lastDizzy = d;
      card.lastPower = `${c.power}${c.charges}`;

      if (c.power) {
        card.powerIcon.setVisible(true).setTexture(POWERS[c.power].texture);
        card.powerText.setText(`${POWERS[c.power].name} ×${c.charges}`);
      } else {
        card.powerIcon.setVisible(false);
        card.powerText.setText('');
      }
    }
  }
}
