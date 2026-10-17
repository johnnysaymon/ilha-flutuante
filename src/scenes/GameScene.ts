import Phaser from 'phaser';
import {
  BLAST_ZONE,
  BUMP,
  CHEST,
  CLOUD,
  GAME_HEIGHT,
  GAME_WIDTH,
  ISLAND,
  PLATFORMS,
  ROUNDS_TO_WIN,
  SPAWN_X,
  type CharacterId,
  type MatchSettings,
  type Surface,
} from '../config';
import { Critter } from '../entities/Critter';
import { IDLE, type Controller } from '../input/Controls';
import { KEYS_P1, KEYS_P2, KEYS_SOLO, KeyboardControls } from '../input/KeyboardControls';
import { MotionControls } from '../input/MotionControls';
import { TouchButtonsControls } from '../input/TouchButtonsControls';
import { AIController } from '../ai/AIController';
import { AI_PRESETS, type AgentView, type WorldView } from '../ai/brain';
import { blastImpulse, knockbackScale, resolveBump } from '../logic/knockback';
import { POWERS, POWER_IDS, POWER_TUNING, type PowerId } from '../powers/powers';
import { sfx } from '../audio/sfx';
import { bake, drawFarIslets, drawIsland, drawTree, driftClouds, makeBackdrop, type DriftingCloud } from '../world';
import { drawSky, textStyle } from '../ui';

type RoundState = 'countdown' | 'play' | 'roundOver';
type ArcadeImage = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

interface Projectile {
  kind: PowerId;
  owner: Critter;
  img: ArcadeImage;
  bornAt: number;
  /** Casca de banana só "arma" depois de cair no chão. */
  armed: boolean;
  colliders: Phaser.Physics.Arcade.Collider[];
}

interface ChestState {
  img: ArcadeImage;
  bornAt: number;
  colliders: Phaser.Physics.Arcade.Collider[];
}

export class GameScene extends Phaser.Scene {
  settings!: MatchSettings;
  critters!: Critter[];
  controllers = new Map<Critter, Controller>();
  score: Record<CharacterId, number> = { bolota: 0, pipoca: 0 };
  round = 1;
  state: RoundState = 'countdown';
  motion: MotionControls | null = null;

  private solids: Phaser.GameObjects.Zone[] = [];
  private oneWays: Phaser.GameObjects.Zone[] = [];
  private cloudZone!: Phaser.GameObjects.Zone;
  private cloudImg!: Phaser.GameObjects.Image;
  private projectiles: Projectile[] = [];
  private chest: ChestState | null = null;
  private nextChestAt = 0;
  private lastBumpAt = -Infinity;
  private backdrop: DriftingCloud[] = [];
  private roundTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super('Game');
  }

  init(data: MatchSettings) {
    this.settings = data;
    this.score = { bolota: 0, pipoca: 0 };
    this.round = 1;
    this.projectiles = [];
    this.chest = null;
    this.solids = [];
    this.oneWays = [];
    this.controllers = new Map();
    this.motion = null;
    this.roundTimers = [];
  }

  create() {
    bake(this, [drawSky(this, GAME_WIDTH, GAME_HEIGHT), drawFarIslets(this)], -100);
    this.backdrop = makeBackdrop(this, GAME_WIDTH, GAME_HEIGHT);
    this.buildIsland();

    this.critters = [
      new Critter(this, 'bolota', SPAWN_X.bolota, ISLAND.top - 30),
      new Critter(this, 'pipoca', SPAWN_X.pipoca, ISLAND.top - 30),
    ];
    for (const c of this.critters) {
      this.physics.add.collider(c.zone, this.solids);
      this.physics.add.collider(c.zone, this.oneWays, undefined, this.oneWayProcess, this);
    }
    const [a, b] = this.critters;
    this.physics.add.overlap(a.zone, b.zone, () => this.onBump());

    this.setupControllers();

    this.scene.launch('Hud', { game: this });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    this.startRound();
  }

  // ---------------------------------------------------------------- mundo

  private buildIsland() {
    bake(this, [
      drawTree(this, ISLAND.left + 95, ISLAND.top, 2),
      drawTree(this, ISLAND.right - 110, ISLAND.top, 2),
      ...drawIsland(this, ISLAND, 3, 7),
      ...PLATFORMS.flatMap((p, i) => drawIsland(this, p, 3, 20 + i)),
    ], 3);

    const addSurface = (s: Surface, thickness: number) => {
      const z = this.add.zone((s.left + s.right) / 2, s.top + thickness / 2, s.right - s.left, thickness);
      this.physics.add.existing(z, true);
      const body = z.body as Phaser.Physics.Arcade.StaticBody;
      if (s.oneWay) {
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        this.oneWays.push(z);
      } else {
        this.solids.push(z);
      }
    };
    addSurface(ISLAND, 40);
    PLATFORMS.forEach((p) => addSurface(p, 14));

    // nuvem que passeia de um lado para o outro
    const cx = (CLOUD.minX + CLOUD.maxX) / 2;
    this.cloudZone = this.add.zone(cx, CLOUD.top + 8, CLOUD.width, 16);
    this.physics.add.existing(this.cloudZone);
    const cb = this.cloudZone.body as Phaser.Physics.Arcade.Body;
    cb.setAllowGravity(false).setImmovable(true).setVelocityX(CLOUD.speed);
    cb.checkCollision.down = false;
    cb.checkCollision.left = false;
    cb.checkCollision.right = false;
    this.oneWays.push(this.cloudZone);
    this.cloudImg = this.add.image(cx, CLOUD.top - 6, 'cloud').setDepth(4).setOrigin(0.5, 0.3);
    this.cloudImg.setDisplaySize(CLOUD.width + 34, 58);

    // pedrinhas flutuando em volta
    for (const [x, y] of [[150, 560], [1130, 600], [1180, 300], [90, 420]]) {
      const r = this.add.ellipse(x, y, 30, 20, 0x9b6b4a).setStrokeStyle(2.5, 0x3b2a4a).setDepth(1);
      const top = this.add.ellipse(x, y - 7, 32, 9, 0x6fcf6a).setStrokeStyle(2.5, 0x3b2a4a).setDepth(1);
      this.tweens.add({ targets: [r, top], y: '-=10', duration: 1600 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  /** Plataformas de mão única: só colide quem vem de cima. */
  private oneWayProcess(
    objA: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    objB: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
  ): boolean {
    const mover = (objA as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    const plat = (objB as Phaser.Types.Physics.Arcade.GameObjectWithBody).body;
    return mover.velocity.y >= 0 && mover.prev.y + mover.height <= plat.top + 8;
  }

  private setupControllers() {
    const [p1, p2] = this.critters;
    const s = this.settings;
    if (s.touchScheme === 'motion') {
      this.motion = new MotionControls(this);
      this.controllers.set(p1, this.motion);
    } else if (s.touchScheme === 'buttons') {
      this.controllers.set(p1, new TouchButtonsControls(this));
    } else {
      this.controllers.set(p1, new KeyboardControls(this, s.mode === 'versus' ? KEYS_P1 : KEYS_SOLO));
    }
    if (s.mode === 'versus') {
      this.controllers.set(p2, new KeyboardControls(this, KEYS_P2));
    } else {
      this.controllers.set(p2, new AIController(() => this.worldViewFor(p2), AI_PRESETS[s.difficulty]));
    }
  }

  /** Sem dados do giroscópio (ou permissão negada): troca para botões na tela. */
  switchToButtons() {
    const p1 = this.critters[0];
    this.motion?.destroy();
    this.motion = null;
    this.settings = { ...this.settings, touchScheme: 'buttons' };
    this.controllers.set(p1, new TouchButtonsControls(this));
  }

  opponentOf(c: Critter): Critter {
    return this.critters[0] === c ? this.critters[1] : this.critters[0];
  }

  private agentView(c: Critter, time: number): AgentView {
    return {
      x: c.x,
      y: c.feetY,
      vx: c.body.velocity.x,
      vy: c.body.velocity.y,
      onGround: c.onGround,
      airJumpsLeft: c.airJumpsLeft,
      canDash: c.canDash(time),
      facing: c.facing,
      power: c.power,
      trapped: c.isTrapped(time),
      stunned: c.isStunned(time),
    };
  }

  worldViewFor(c: Critter): WorldView {
    const time = this.time.now;
    const foe = this.opponentOf(c);
    const cloudBody = this.cloudZone.body as Phaser.Physics.Arcade.Body;
    return {
      self: this.agentView(c, time),
      foe: this.agentView(foe, time),
      chest: this.chest ? { x: this.chest.img.x, y: this.chest.img.body.bottom } : null,
      threats: this.projectiles
        .filter((p) => p.owner === foe && p.kind !== 'banana')
        .map((p) => ({ x: p.img.x, y: p.img.y, vx: p.img.body.velocity.x, vy: p.img.body.velocity.y })),
      traps: this.projectiles.filter((p) => p.owner === foe && p.kind === 'banana').map((p) => ({ x: p.img.x, y: p.img.body.bottom })),
      island: ISLAND,
      platforms: [...PLATFORMS, { left: cloudBody.left, right: cloudBody.right, top: cloudBody.top, oneWay: true }],
    };
  }

  // --------------------------------------------------------------- rodadas

  private startRound() {
    this.roundTimers.forEach((t) => t.remove());
    this.roundTimers = [];
    for (const p of [...this.projectiles]) this.removeProjectile(p);
    this.removeChest();
    for (const c of this.critters) c.reset(SPAWN_X[c.id], ISLAND.top - 30);
    this.state = 'countdown';
    this.lastBumpAt = -Infinity;

    this.events.emit('banner', `Rodada ${this.round}`, 900);
    const steps: Array<[number, string, () => void]> = [
      [1000, '3', () => sfx.tick()],
      [1500, '2', () => sfx.tick()],
      [2000, '1', () => sfx.tick()],
    ];
    for (const [at, label, fn] of steps) {
      this.roundTimers.push(this.time.delayedCall(at, () => {
        fn();
        this.events.emit('banner', label, 450);
      }));
    }
    this.roundTimers.push(this.time.delayedCall(2500, () => {
      sfx.go();
      this.events.emit('banner', 'Já!', 600);
      this.state = 'play';
      this.nextChestAt = this.time.now + Phaser.Math.Between(2500, 4500);
      this.controllers.forEach((ctrl) => ctrl.onRoundStart?.());
    }));
  }

  private eliminate(loser: Critter) {
    if (this.state === 'roundOver') return;
    this.state = 'roundOver';
    loser.eliminated = true;
    const winner = this.opponentOf(loser);
    winner.celebrating = true;
    this.score[winner.id]++;
    sfx.fall();
    this.cameras.main.shake(250, 0.006);

    // estrelinha onde caiu
    const fx = this.add.particles(Phaser.Math.Clamp(loser.x, 20, GAME_WIDTH - 20), GAME_HEIGHT - 10, 'spark', {
      speed: { min: 120, max: 320 },
      angle: { min: 230, max: 310 },
      scale: { start: 1.2, end: 0 },
      tint: [0xffd34d, 0xff8fb8, 0xffffff],
      lifespan: 700,
      emitting: false,
    });
    fx.explode(24);

    const matchOver = this.score[winner.id] >= ROUNDS_TO_WIN;
    this.events.emit('banner', `${winner.name} ficou na ilha!`, 1800, matchOver ? 'Fim de jogo' : `${this.score.bolota} × ${this.score.pipoca}`);
    this.roundTimers.push(this.time.delayedCall(2200, () => {
      if (matchOver) {
        sfx.win();
        this.scene.stop('Hud');
        this.scene.start('Result', { winner: winner.id, score: { ...this.score }, settings: this.settings });
      } else {
        this.round++;
        this.startRound();
      }
    }));
  }

  // ----------------------------------------------------------------- update

  update(time: number, delta: number) {
    const dt = delta / 1000;
    driftClouds(this.backdrop, dt, GAME_WIDTH);

    const cb = this.cloudZone.body as Phaser.Physics.Arcade.Body;
    if (cb.center.x > CLOUD.maxX) cb.setVelocityX(-CLOUD.speed);
    else if (cb.center.x < CLOUD.minX) cb.setVelocityX(CLOUD.speed);
    this.cloudImg.setPosition(cb.center.x, CLOUD.top - 6 + Math.sin(time / 500) * 1.5);

    for (const c of this.critters) {
      const ctrl = this.controllers.get(c)!;
      const input = this.state === 'play' && !c.eliminated ? ctrl.read(time) : { ...IDLE };
      if (this.state !== 'play') ctrl.read(time); // descarta toques/pulos enfileirados
      if (input.fire && ctrl.fireDashesWhenEmpty && !c.power) {
        input.dash = true;
        input.fire = false;
      }
      const actions = c.update(time, delta, input);
      if (actions.fired) this.firePower(c, time);
    }

    this.updateProjectiles(time);
    this.updateChest(time);

    if (this.state !== 'roundOver') {
      for (const c of this.critters) {
        const out = c.feetY > BLAST_ZONE.bottom || c.x < BLAST_ZONE.left || c.x > BLAST_ZONE.right || c.feetY < BLAST_ZONE.top;
        if (out) {
          this.eliminate(c);
          break;
        }
      }
    }

    // A física já foi calculada neste quadro: cola os desenhos nos corpos.
    for (const c of this.critters) c.syncVisual(time);
  }

  // ----------------------------------------------------------- empurrões

  private onBump() {
    const time = this.time.now;
    if (time - this.lastBumpAt < BUMP.cooldownMs || this.state === 'roundOver') return;
    const [a, b] = this.critters;
    const res = resolveBump(
      { x: a.x, vx: a.body.velocity.x, dashing: a.isDashing(time), dizzy: a.dizzy, trapped: a.isTrapped(time) },
      { x: b.x, vx: b.body.velocity.x, dashing: b.isDashing(time), dizzy: b.dizzy, trapped: b.isTrapped(time) },
    );
    this.lastBumpAt = time;

    if (!res.winner) {
      a.body.velocity.x = res.a.vx;
      b.body.velocity.x = res.b.vx;
      return;
    }
    const victim = res.winner === 'a' ? b : a;
    const attacker = res.winner === 'a' ? a : b;
    const hit = res.winner === 'a' ? res.b : res.a;
    const recoil = res.winner === 'a' ? res.a : res.b;
    victim.applyKnockback(time, hit.vx, hit.vy, hit.damage, BUMP.hitstunMs + hit.damage * 9);
    attacker.body.setVelocity(recoil.vx, Math.min(attacker.body.velocity.y, recoil.vy));

    const strong = Math.abs(hit.vx) > 480;
    sfx.bump(strong);
    if (strong) this.cameras.main.shake(120, 0.004);
    this.burst((a.x + b.x) / 2, (a.feetY + b.feetY) / 2 - 12, 'spark', [0xffffff, 0xffd34d], strong ? 12 : 6);
  }

  private burst(x: number, y: number, tex: string, tint: number[], count: number, speed = 180) {
    const p = this.add.particles(x, y, tex, {
      speed: { min: speed * 0.4, max: speed },
      scale: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint,
      lifespan: 450,
      emitting: false,
    }).setDepth(20);
    p.explode(count);
    this.time.delayedCall(500, () => p.destroy());
  }

  // ----------------------------------------------------------------- poderes

  private firePower(c: Critter, time: number) {
    const kind = c.consumePower();
    if (!kind) return;
    const def = POWERS[kind];
    const dir = c.facing;
    const y = c.feetY - 14;
    let img: ArcadeImage;

    switch (kind) {
      case 'vento':
      case 'bolha': {
        const speed = kind === 'vento' ? POWER_TUNING.vento.speed : POWER_TUNING.bolha.speed;
        img = this.physics.add.image(c.x + dir * 18, y, def.texture);
        img.body.setAllowGravity(false);
        img.setVelocityX(dir * speed).setFlipX(dir < 0);
        if (kind === 'vento') sfx.wind();
        else sfx.bubble();
        break;
      }
      case 'bomba': {
        const t = POWER_TUNING.bomba;
        img = this.physics.add.image(c.x + dir * 14, y - 6, def.texture);
        img.setVelocity(dir * t.vx + c.body.velocity.x * 0.3, t.vy);
        img.setAngularVelocity(dir * 400);
        img.body.setCircle(10, 2, 2);
        sfx.throwIt();
        break;
      }
      case 'banana': {
        img = this.physics.add.image(c.x - dir * 20, c.feetY - 12, def.texture);
        img.setVelocity(-dir * 110 + c.body.velocity.x * 0.2, -170);
        img.body.setSize(22, 10).setOffset(3, 7);
        sfx.throwIt();
        break;
      }
    }
    img.setDepth(15);
    const proj: Projectile = { kind, owner: c, img, bornAt: time, armed: kind !== 'banana', colliders: [] };
    if (kind === 'bomba' || kind === 'banana') {
      proj.colliders.push(
        this.physics.add.collider(img, this.solids, () => this.onProjectileLand(proj)),
        this.physics.add.collider(img, this.oneWays, () => this.onProjectileLand(proj), this.oneWayProcess, this),
      );
    }
    proj.colliders.push(this.physics.add.overlap(img, this.opponentOf(c).zone, () => this.onProjectileHit(proj)));
    this.projectiles.push(proj);
  }

  private onProjectileLand(p: Projectile) {
    if (p.kind === 'bomba') this.explode(p);
    else if (p.kind === 'banana' && !p.armed && (p.img.body.blocked.down || p.img.body.touching.down)) {
      p.armed = true;
      p.img.setVelocity(0, 0);
    }
  }

  private onProjectileHit(p: Projectile) {
    if (!this.projectiles.includes(p) || this.state === 'roundOver') return;
    const time = this.time.now;
    const foe = this.opponentOf(p.owner);
    switch (p.kind) {
      case 'vento': {
        const t = POWER_TUNING.vento;
        const dir = Math.sign(p.img.body.velocity.x) || 1;
        const scale = knockbackScale(foe.dizzy, foe.isTrapped(time));
        foe.applyKnockback(time, dir * t.force * scale, -t.lift * Math.min(scale, 2), t.damage, 320);
        sfx.bump(true);
        this.burst(p.img.x, p.img.y, 'dot', [0xffffff, 0x9fe3ff], 10);
        this.removeProjectile(p);
        break;
      }
      case 'bolha': {
        if (foe.isTrapped(time)) return;
        foe.dizzy += POWER_TUNING.bolha.damage;
        foe.trap(time, POWER_TUNING.bolha.trapMs);
        sfx.bubble();
        this.removeProjectile(p);
        break;
      }
      case 'bomba':
        this.explode(p);
        break;
      case 'banana': {
        if (!p.armed || !foe.onGround) return;
        const t = POWER_TUNING.banana;
        const dir = Math.sign(foe.body.velocity.x) || foe.facing;
        const scale = Math.sqrt(knockbackScale(foe.dizzy));
        foe.applyKnockback(time, dir * t.slide * scale, -120, t.damage, t.stunMs);
        sfx.slip();
        this.burst(p.img.x, p.img.y, 'spark', [0xffe066], 8);
        this.removeProjectile(p);
        break;
      }
    }
  }

  private explode(p: Projectile) {
    if (!this.projectiles.includes(p)) return;
    const time = this.time.now;
    const t = POWER_TUNING.bomba;
    const foe = this.opponentOf(p.owner);
    const imp = blastImpulse(p.img.x, p.img.y, foe.x, foe.feetY - 12, t.radius, t.force, foe.dizzy);
    if (imp) foe.applyKnockback(time, imp.vx, imp.vy, t.damage, 380);
    sfx.boom();
    this.cameras.main.shake(160, 0.006);
    this.burst(p.img.x, p.img.y, 'petal', [0xff8fb8, 0xffb3cf, 0xffffff, 0xffe066], 26, 320);
    const ring = this.add.circle(p.img.x, p.img.y, 10).setStrokeStyle(4, 0xff8fb8).setDepth(19);
    this.tweens.add({ targets: ring, radius: t.radius, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    this.removeProjectile(p);
  }

  private removeProjectile(p: Projectile) {
    const i = this.projectiles.indexOf(p);
    if (i >= 0) this.projectiles.splice(i, 1);
    p.colliders.forEach((c) => c.destroy());
    p.img.destroy();
  }

  private updateProjectiles(time: number) {
    for (const p of [...this.projectiles]) {
      const age = time - p.bornAt;
      const img = p.img;
      const offscreen = img.x < -80 || img.x > GAME_WIDTH + 80 || img.y > GAME_HEIGHT + 80;
      switch (p.kind) {
        case 'vento':
          img.setScale(1 + Math.sin(age / 40) * 0.08);
          if (age > POWER_TUNING.vento.life || offscreen) this.removeProjectile(p);
          break;
        case 'bolha':
          img.body.velocity.y = Math.sin(age / 110) * 50;
          if (age > POWER_TUNING.bolha.life || offscreen) {
            if (!offscreen) this.burst(img.x, img.y, 'dot', [0xb8f0ff], 6);
            this.removeProjectile(p);
          }
          break;
        case 'bomba':
          if (offscreen) this.removeProjectile(p);
          else if (age > POWER_TUNING.bomba.life) this.explode(p);
          break;
        case 'banana':
          if (offscreen) this.removeProjectile(p);
          else if (age > POWER_TUNING.banana.life) {
            this.tweens.add({ targets: img, alpha: 0, duration: 200 });
            this.removeProjectile(p);
          } else if (p.armed) {
            img.body.velocity.x *= 0.9;
          }
          break;
      }
    }
  }

  // -------------------------------------------------------------------- baús

  private spawnChest(time: number) {
    const surfaces = [ISLAND, ISLAND, ...PLATFORMS];
    const s = Phaser.Utils.Array.GetRandom(surfaces);
    const x = Phaser.Math.Between(s.left + 30, s.right - 30);
    const img = this.physics.add.image(x, -30, 'chest').setDepth(8);
    img.body.setSize(30, 24).setOffset(4, 10);
    img.setVelocityY(80);
    img.body.setMaxVelocityY(420);
    const colliders = [
      this.physics.add.collider(img, this.solids),
      this.physics.add.collider(img, this.oneWays, undefined, this.oneWayProcess, this),
      ...this.critters.map((c) => this.physics.add.overlap(img, c.zone, () => this.openChest(c))),
    ];
    this.chest = { img, bornAt: time, colliders };
    // paraquedinha de folha enquanto cai
    const sparkle = this.add.particles(0, 0, 'spark', {
      follow: img,
      speed: 20,
      scale: { start: 0.6, end: 0 },
      tint: 0xffd34d,
      lifespan: 500,
      frequency: 90,
    }).setDepth(7);
    img.setData('sparkle', sparkle);
  }

  private openChest(c: Critter) {
    if (!this.chest || this.state !== 'play' || c.eliminated) return;
    const { img, colliders } = this.chest;
    const power = Phaser.Utils.Array.GetRandom(POWER_IDS);
    c.givePower(power);
    sfx.chest();
    colliders.forEach((col) => col.destroy());
    this.chest = null;
    this.scheduleNextChest();
    (img.getData('sparkle') as Phaser.GameObjects.Particles.ParticleEmitter)?.destroy();
    img.body.enable = false;
    img.setTexture('chest-open');
    this.burst(img.x, img.y - 8, 'spark', [0xffd34d, 0xffffff], 14);
    this.tweens.add({ targets: img, alpha: 0, y: img.y - 10, delay: 350, duration: 300, onComplete: () => img.destroy() });

    const icon = this.add.image(img.x, img.y - 10, POWERS[power].texture).setDepth(30);
    this.tweens.add({ targets: icon, y: icon.y - 50, scale: 1.6, alpha: 0, duration: 800, ease: 'Cubic.Out', onComplete: () => icon.destroy() });
    const label = this.add
      .text(img.x, img.y - 46, POWERS[power].name + '!', textStyle(20, '#ffffff', { stroke: '#3b2a4a', strokeThickness: 5 }))
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: label, y: label.y - 30, alpha: 0, delay: 500, duration: 700, onComplete: () => label.destroy() });
  }

  private removeChest() {
    if (!this.chest) return;
    (this.chest.img.getData('sparkle') as Phaser.GameObjects.Particles.ParticleEmitter)?.destroy();
    this.chest.colliders.forEach((c) => c.destroy());
    this.chest.img.destroy();
    this.chest = null;
  }

  private updateChest(time: number) {
    if (this.state !== 'play') return;
    if (!this.chest) {
      if (time >= this.nextChestAt) {
        this.spawnChest(time);
        this.nextChestAt = Infinity;
      }
      return;
    }
    const age = time - this.chest.bornAt;
    const img = this.chest.img;
    if (img.body.blocked.down || img.body.touching.down) {
      img.setAngle(Math.sin(time / 120) * 4);
    }
    if (age > CHEST.lifetime - 2000) img.setAlpha(Math.floor(time / 120) % 2 ? 0.4 : 1);
    if (age > CHEST.lifetime || img.y > GAME_HEIGHT + 60) {
      this.removeChest();
      this.scheduleNextChest();
    }
  }

  private scheduleNextChest() {
    this.nextChestAt = this.time.now + Phaser.Math.Between(CHEST.minDelay, CHEST.maxDelay);
  }

  // ----------------------------------------------------------------- pausa

  togglePause() {
    if (this.scene.isPaused()) {
      this.scene.resume();
      this.events.emit('paused', false);
    } else {
      this.scene.pause();
      this.events.emit('paused', true);
    }
  }

  private cleanup() {
    this.controllers.forEach((c) => c.destroy?.());
    this.controllers.clear();
    this.critters.forEach((c) => c.destroy());
  }
}
