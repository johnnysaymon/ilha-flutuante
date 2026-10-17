import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultScene } from './scenes/ResultScene';

// `?canvas` força o renderizador Canvas (útil em aparelhos/navegadores sem WebGL bom).
const params = new URLSearchParams(location.search);
const forceCanvas = params.has('canvas');

const game = new Phaser.Game({
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#8fd3ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY }, debug: false },
  },
  input: { activePointers: 4 },
  // `?timer` troca requestAnimationFrame por setTimeout (navegadores headless limitam o rAF).
  fps: params.has('timer') ? { forceSetTimeOut: true, target: 60 } : undefined,
  scene: [BootScene, MenuScene, GameScene, HudScene, ResultScene],
});

// Facilita testes automatizados e depuração no console.
(window as unknown as { __game: Phaser.Game }).__game = game;
