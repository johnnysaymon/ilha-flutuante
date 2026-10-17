import Phaser from 'phaser';
import { DIFFICULTY_LABEL, GAME_HEIGHT, GAME_WIDTH, type Difficulty, type MatchSettings, type TouchScheme } from '../config';
import { critterKey } from '../art';
import { bake, drawFarIslets, drawIsland, driftClouds, makeBackdrop, type DriftingCloud } from '../world';
import { drawSky, isTouchDevice, makeButton, textStyle } from '../ui';
import { requestMotionPermission } from '../input/MotionControls';
import { sfx } from '../audio/sfx';

const ORDER: Difficulty[] = ['facil', 'normal', 'dificil'];

export class MenuScene extends Phaser.Scene {
  private clouds: DriftingCloud[] = [];
  private notice!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  private get difficulty(): Difficulty {
    return (this.registry.get('difficulty') as Difficulty) ?? 'normal';
  }

  create() {
    bake(this, [drawSky(this, GAME_WIDTH, GAME_HEIGHT), drawFarIslets(this)], -100);
    this.clouds = makeBackdrop(this, GAME_WIDTH, GAME_HEIGHT);

    const title = this.add
      .text(GAME_WIDTH / 2, 100, 'Ilha Flutuante', textStyle(92, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 14 }))
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 112, angle: 1.5, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add
      .text(GAME_WIDTH / 2, 178, 'Derrube o amiguinho da ilha!', textStyle(28, '#3b2a4a'))
      .setOrigin(0.5);

    const island = { left: 400, right: 880, top: 610, oneWay: false };
    bake(this, drawIsland(this, island, 1, 3), 1);
    this.cuteCritter('bolota', 560, island.top, 1);
    this.cuteCritter('pipoca', 720, island.top, -1);

    const touch = isTouchDevice();
    const start = (s: Partial<MatchSettings>) =>
      this.scene.start('Game', { mode: 'cpu', difficulty: this.difficulty, touchScheme: null, ...s } satisfies MatchSettings);

    if (touch) {
      makeButton(this, GAME_WIDTH / 2, 270, 'Jogar com giroscópio', () => this.startTouch('motion', start));
      makeButton(this, GAME_WIDTH / 2, 350, 'Jogar com botões', () => this.startTouch('buttons', start), { fill: 0x9fe3ff });
    } else {
      makeButton(this, GAME_WIDTH / 2, 270, '1 Jogador × Computador', () => start({ mode: 'cpu' }));
      makeButton(this, GAME_WIDTH / 2, 350, '2 Jogadores (teclado)', () => start({ mode: 'versus' }), { fill: 0x9fe3ff });
    }
    const diffBtn = makeButton(
      this,
      GAME_WIDTH / 2,
      430,
      `Computador: ${DIFFICULTY_LABEL[this.difficulty]}`,
      () => {
        const next = ORDER[(ORDER.indexOf(this.difficulty) + 1) % ORDER.length];
        this.registry.set('difficulty', next);
        diffBtn.setLabel(`Computador: ${DIFFICULTY_LABEL[next]}`);
      },
      { fill: 0xffb3cf, height: 54, fontSize: 22, width: 300 },
    );

    const mute = this.add
      .text(GAME_WIDTH - 30, 30, sfx.muted ? '🔇' : '🔊', { fontSize: '34px' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    mute.on('pointerup', () => {
      sfx.muted = !sfx.muted;
      mute.setText(sfx.muted ? '🔇' : '🔊');
    });

    this.notice = this.add
      .text(GAME_WIDTH / 2, 490, '', textStyle(20, '#e0365a', { stroke: '#ffffff', strokeThickness: 5, align: 'center' }))
      .setOrigin(0.5);

    if (!touch) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'Abra no celular para jogar com o giroscópio', textStyle(16, '#3b2a4a'))
        .setOrigin(0.5, 1)
        .setAlpha(0.7)
        .setDepth(5);
    }
  }

  private startTouch(scheme: TouchScheme, start: (s: Partial<MatchSettings>) => void) {
    // Tudo isto precisa acontecer dentro do toque (exigência do iOS/Android).
    const permission = scheme === 'motion' ? requestMotionPermission() : Promise.resolve(true);
    try {
      if (!this.scale.isFullscreen) this.scale.startFullscreen();
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      orientation?.lock?.('landscape').catch(() => undefined);
    } catch {
      // tela cheia é opcional
    }
    void permission.then((ok) => {
      if (scheme === 'motion' && !ok) {
        this.notice.setText('Não foi possível usar o giroscópio.\nVamos jogar com botões na tela!');
        this.time.delayedCall(1500, () => start({ touchScheme: 'buttons' }));
        return;
      }
      start({ touchScheme: scheme });
    });
  }

  private cuteCritter(id: 'bolota' | 'pipoca', x: number, groundY: number, facing: 1 | -1) {
    const img = this.add.image(x, groundY + 1, critterKey(id, 'idle')).setOrigin(0.5, 44 / 46).setScale(2).setDepth(5);
    img.setFlipX(facing < 0);
    const hop = () => {
      this.tweens.chain({
        targets: img,
        tweens: [
          { scaleX: 2.3, scaleY: 1.7, duration: 120 },
          { y: groundY - 40, scaleX: 1.8, scaleY: 2.3, duration: 260, ease: 'Quad.Out' },
          { y: groundY + 1, scaleX: 2, scaleY: 2, duration: 240, ease: 'Quad.In' },
          { scaleX: 2.3, scaleY: 1.7, duration: 90, yoyo: true },
        ],
        onComplete: () => this.time.delayedCall(Phaser.Math.Between(700, 1800), hop),
      });
    };
    this.time.delayedCall(id === 'bolota' ? 300 : 900, hop);
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        img.setTexture(critterKey(id, 'blink'));
        this.time.delayedCall(140, () => img.setTexture(critterKey(id, 'idle')));
      },
    });
  }

  update(_t: number, delta: number) {
    driftClouds(this.clouds, delta / 1000, GAME_WIDTH);
  }
}
