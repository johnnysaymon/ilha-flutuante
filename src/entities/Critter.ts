import Phaser from 'phaser';
import { CHARACTERS, PHYS, type CharacterId } from '../config';
import { CRITTER_TEX, critterKey, type Face } from '../art';
import type { ControlState } from '../input/Controls';
import type { PowerId } from '../powers/powers';
import { POWERS } from '../powers/powers';
import { sfx } from '../audio/sfx';

export const BODY_SIZE = { w: 22, h: 24 };

export interface CritterActions {
  jumped: boolean;
  dashed: boolean;
  fired: boolean;
}

/**
 * Um bichinho jogável. A física fica numa Zone invisível e o desenho num Image separado,
 * assim as animações de esticar/achatar não mexem na caixa de colisão.
 */
export class Critter {
  readonly name: string;
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly sprite: Phaser.GameObjects.Image;
  private bubble: Phaser.GameObjects.Image;
  private dizzyStars: Phaser.GameObjects.Image[];

  facing: 1 | -1;
  dizzy = 0;
  power: PowerId | null = null;
  charges = 0;
  airJumpsLeft = PHYS.airJumps;
  eliminated = false;
  celebrating = false;
  /** Último a acertar este bichinho (para saber quem derrubou quem). */
  lastHitAt = -Infinity;

  private dashUntil = 0;
  private dashReadyAt = 0;
  private airDashUsed = false;
  private stunUntil = 0;
  private trappedUntil = 0;
  private wasOnGround = false;
  private lastGroundAt = 0;
  private squashX = 1;
  private squashY = 1;
  private blinkUntil = 0;
  private nextBlink = 0;

  constructor(
    private scene: Phaser.Scene,
    readonly id: CharacterId,
    x: number,
    y: number,
  ) {
    this.name = CHARACTERS[id].name;
    this.facing = id === 'bolota' ? 1 : -1;
    this.zone = scene.add.zone(x, y, BODY_SIZE.w, BODY_SIZE.h);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocityY(PHYS.maxFall);
    this.sprite = scene.add
      .image(x, y, critterKey(id, 'idle'))
      .setOrigin(0.5, CRITTER_TEX.feetY / CRITTER_TEX.h)
      .setDepth(10);
    this.bubble = scene.add.image(x, y, 'p-bolha').setScale(1.9).setDepth(11).setVisible(false);
    this.dizzyStars = [0, 1].map(() => scene.add.image(x, y, 'star').setScale(0.45).setDepth(12).setVisible(false));
  }

  get x() { return this.body.center.x; }
  get feetY() { return this.body.bottom; }
  get onGround() { return this.body.blocked.down || this.body.touching.down; }
  isDashing(time: number) { return time < this.dashUntil; }
  isStunned(time: number) { return time < this.stunUntil; }
  isTrapped(time: number) { return time < this.trappedUntil; }
  canDash(time: number) { return time >= this.dashReadyAt && (this.onGround || !this.airDashUsed); }

  reset(x: number, y: number) {
    this.body.reset(x, y);
    this.body.setAllowGravity(true);
    this.dizzy = 0;
    this.power = null;
    this.charges = 0;
    this.eliminated = false;
    this.celebrating = false;
    this.dashUntil = this.dashReadyAt = this.stunUntil = this.trappedUntil = 0;
    this.airJumpsLeft = PHYS.airJumps;
    this.facing = x < this.scene.scale.width / 2 ? 1 : -1;
    this.bubble.setVisible(false);
    this.sprite.setVisible(true).setAngle(0).setAlpha(1);
  }

  givePower(id: PowerId) {
    this.power = id;
    this.charges = POWERS[id].charges;
  }

  /** Gasta uma carga do poder atual; retorna qual foi usado. */
  consumePower(): PowerId | null {
    if (!this.power || this.charges <= 0) return null;
    const used = this.power;
    this.charges--;
    if (this.charges <= 0) this.power = null;
    return used;
  }

  applyKnockback(time: number, vx: number, vy: number, damage: number, stunMs: number) {
    this.dizzy = Math.min(999, this.dizzy + damage);
    this.dashUntil = 0;
    this.stunUntil = Math.max(this.stunUntil, time + stunMs);
    this.lastHitAt = time;
    if (this.isTrapped(time)) this.releaseBubble();
    this.body.setVelocity(vx, vy);
    this.squashX = 1.3;
    this.squashY = 0.75;
  }

  trap(time: number, ms: number) {
    this.trappedUntil = time + ms;
    this.dashUntil = 0;
    this.body.setAllowGravity(false);
    this.body.setVelocity(this.body.velocity.x * 0.2, -40);
    this.bubble.setVisible(true).setScale(0.4);
    this.scene.tweens.add({ targets: this.bubble, scale: 1.9, duration: 220, ease: 'Back.Out' });
  }

  private releaseBubble() {
    this.trappedUntil = 0;
    this.body.setAllowGravity(true);
    if (this.bubble.visible) {
      sfx.pop();
      this.bubble.setVisible(false);
      const burst = this.scene.add.particles(this.x, this.feetY - 14, 'dot', {
        speed: { min: 60, max: 160 },
        scale: { start: 0.6, end: 0 },
        tint: 0xb8f0ff,
        lifespan: 350,
        emitting: false,
      });
      burst.explode(10);
      this.scene.time.delayedCall(400, () => burst.destroy());
    }
  }

  update(time: number, delta: number, input: ControlState): CritterActions {
    const dt = delta / 1000;
    const body = this.body;
    const actions: CritterActions = { jumped: false, dashed: false, fired: false };
    const onGround = this.onGround;

    if (onGround) {
      this.lastGroundAt = time;
      if (!this.wasOnGround) {
        this.airJumpsLeft = PHYS.airJumps;
        this.airDashUsed = false;
        if (body.velocity.y >= 0) {
          this.squashX = 1.3;
          this.squashY = 0.72;
          sfx.land();
        }
      }
    }
    this.wasOnGround = onGround;

    if (this.isTrapped(time)) {
      body.setVelocity(body.velocity.x * 0.95, -35 + Math.sin(time / 120) * 20);
      return actions;
    } else if (this.trappedUntil !== 0) {
      this.releaseBubble();
    }

    if (this.isStunned(time)) {
      if (onGround) body.velocity.x = approach(body.velocity.x, 0, PHYS.stunFriction * dt);
      return actions;
    }

    if (this.isDashing(time)) {
      body.setVelocity(this.facing * PHYS.dashSpeed, Math.min(body.velocity.y, 0) * 0.5);
      return actions;
    }

    // Andar
    if (Math.abs(input.move) > 0.01) this.facing = input.move > 0 ? 1 : -1;
    const target = input.move * PHYS.runSpeed;
    let rate: number;
    if (onGround) rate = Math.abs(input.move) < 0.01 ? PHYS.groundFriction : PHYS.groundAccel;
    else rate = PHYS.airAccel * (Math.abs(body.velocity.x) > PHYS.runSpeed && Math.sign(body.velocity.x) === Math.sign(target) ? 0.3 : 1);
    body.velocity.x = approach(body.velocity.x, target, rate * dt);

    // Pular (com "coyote time" para pulos na beirada)
    if (input.jump) {
      if (onGround || time - this.lastGroundAt < 90) {
        body.velocity.y = -PHYS.jumpVelocity;
        this.lastGroundAt = -Infinity;
        this.squashX = 0.75;
        this.squashY = 1.3;
        actions.jumped = true;
        sfx.jump();
      } else if (this.airJumpsLeft > 0) {
        this.airJumpsLeft--;
        body.velocity.y = -PHYS.jumpVelocity * 0.88;
        this.squashX = 0.8;
        this.squashY = 1.25;
        actions.jumped = true;
        sfx.doubleJump();
        this.puff(0xffffff);
      }
    }

    if (input.dash && this.canDash(time)) {
      this.dashUntil = time + PHYS.dashTime;
      this.dashReadyAt = time + PHYS.dashCooldown;
      if (!onGround) this.airDashUsed = true;
      actions.dashed = true;
      sfx.dash();
      this.puff(0xffffff);
    }

    actions.fired = input.fire;
    return actions;
  }

  private puff(tint: number) {
    const p = this.scene.add.particles(this.x, this.feetY, 'dot', {
      speed: { min: 30, max: 90 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      tint,
      lifespan: 300,
      emitting: false,
    });
    p.explode(6);
    this.scene.time.delayedCall(350, () => p.destroy());
  }

  /** Atualiza o desenho (posição, carinha, animações). Chamar depois da física. */
  syncVisual(time: number) {
    const s = this.sprite;
    const body = this.body;
    const onGround = this.onGround;

    this.squashX += (1 - this.squashX) * 0.18;
    this.squashY += (1 - this.squashY) * 0.18;

    let bob = 0;
    let angle = 0;
    if (this.celebrating) {
      bob = -Math.abs(Math.sin(time / 140)) * 8;
    } else if (this.isStunned(time) && !onGround) {
      angle = (time / 2) % 360;
    } else if (onGround && Math.abs(body.velocity.x) > 30) {
      bob = -Math.abs(Math.sin(time / 70)) * 2.5;
      angle = Phaser.Math.Clamp(body.velocity.x / PHYS.runSpeed, -1, 1) * 7;
    } else if (!onGround) {
      angle = Phaser.Math.Clamp(body.velocity.x / 60, -10, 10);
    } else {
      // respirar parado
      this.squashY *= 1 + Math.sin(time / 300) * 0.006;
    }
    if (this.isDashing(time)) {
      this.squashX = 1.25;
      this.squashY = 0.85;
    }

    s.setPosition(body.center.x, body.bottom + 1 + bob);
    s.setScale(this.squashX, this.squashY);
    s.setFlipX(this.facing < 0);
    s.setAngle(angle);

    if (time > this.nextBlink) {
      this.blinkUntil = time + 130;
      this.nextBlink = time + 1800 + Math.random() * 2600;
    }
    let face: Face = 'idle';
    if (this.celebrating) face = 'happy';
    else if (this.isStunned(time) || this.isTrapped(time) || this.eliminated) face = 'hurt';
    else if (time < this.blinkUntil) face = 'blink';
    s.setTexture(critterKey(this.id, face));

    this.bubble.setPosition(body.center.x, body.center.y - 6);

    const showStars = this.dizzy >= 70 && !this.eliminated;
    this.dizzyStars.forEach((st, i) => {
      st.setVisible(showStars);
      if (!showStars) return;
      const a = time / 220 + i * Math.PI;
      st.setPosition(body.center.x + Math.cos(a) * 14, body.top - 22 + Math.sin(a) * 4);
      st.setAngle(time / 4);
    });
  }

  destroy() {
    this.zone.destroy();
    this.sprite.destroy();
    this.bubble.destroy();
    this.dizzyStars.forEach((s) => s.destroy());
  }
}

function approach(value: number, target: number, step: number) {
  if (value < target) return Math.min(target, value + step);
  if (value > target) return Math.max(target, value - step);
  return value;
}
