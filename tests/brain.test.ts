import { describe, expect, it } from 'vitest';
import { AI_PRESETS, decide, type AgentView, type WorldView } from '../src/ai/brain';
import { ISLAND, PLATFORMS } from '../src/config';

const agent = (over: Partial<AgentView> = {}): AgentView => ({
  x: 640, y: ISLAND.top, vx: 0, vy: 0, onGround: true, airJumpsLeft: 1, canDash: true,
  facing: 1, power: null, trapped: false, stunned: false, ...over,
});
const world = (self: Partial<AgentView>, foe: Partial<AgentView>, extra: Partial<WorldView> = {}): WorldView => ({
  self: agent(self), foe: agent(foe), chest: null, threats: [], traps: [], island: ISLAND, platforms: PLATFORMS, ...extra,
});
const hard = AI_PRESETS.dificil;
const never = () => 0.99;
const always = () => 0;

describe('IA', () => {
  it('fora da ilha, volta para o centro e usa o pulo duplo', () => {
    const d = decide(world({ x: ISLAND.left - 60, y: ISLAND.top + 30, vy: 200, onGround: false }, { x: 700 }), hard, never);
    expect(d.mode).toBe('recover');
    expect(d.targetX!).toBeGreaterThan(ISLAND.left);
    expect(d.jump).toBe(true);
  });

  it('sem pulos sobrando, tenta a investida de volta', () => {
    const d = decide(world({ x: ISLAND.right + 80, y: ISLAND.top + 10, vy: 200, onGround: false, airJumpsLeft: 0 }, { x: 700 }), hard, never);
    expect(d.dash).toBe(true);
    expect(d.face).toBe(-1);
  });

  it('pula projéteis que vêm em sua direção', () => {
    const d = decide(
      world({ x: 640 }, { x: 900 }, { threats: [{ x: 500, y: ISLAND.top - 16, vx: 600, vy: 0 }] }),
      hard,
      always,
    );
    expect(d.mode).toBe('dodge');
    expect(d.jump).toBe(true);
  });

  it('vai buscar o baú quando não tem poder', () => {
    const d = decide(world({ x: 640 }, { x: 900 }, { chest: { x: 450, y: ISLAND.top } }), hard, never);
    expect(d.mode).toBe('chest');
    expect(d.targetX).toBe(450);
  });

  it('pula para alcançar um baú na plataforma de cima', () => {
    const p = PLATFORMS[0];
    const d = decide(world({ x: (p.left + p.right) / 2 }, { x: 1000 }, { chest: { x: p.left + 40, y: p.top } }), hard, never);
    expect(d.jump).toBe(true);
  });

  it('dispara o vento quando alinhado e virado para o adversário', () => {
    const d = decide(world({ x: 500, power: 'vento', facing: 1 }, { x: 800 }), hard, always);
    expect(d.fire).toBe(true);
  });

  it('vira antes de disparar se estiver de costas', () => {
    const d = decide(world({ x: 500, power: 'vento', facing: -1 }, { x: 800 }), hard, always);
    expect(d.fire).toBe(false);
    expect(d.face).toBe(1);
  });

  it('encurralado na borda, foge para o centro', () => {
    const d = decide(world({ x: ISLAND.left + 20 }, { x: ISLAND.left + 200 }), hard, never);
    expect(d.mode).toBe('edge');
    expect(d.targetX!).toBeGreaterThan(ISLAND.left + 20);
  });

  it('persegue o adversário mas não passa da margem de segurança', () => {
    const d = decide(world({ x: 640 }, { x: ISLAND.right - 5 }), hard, never);
    expect(d.mode === 'chase' || d.mode === 'attack').toBe(true);
    expect(d.targetX!).toBeLessThan(ISLAND.right);
  });

  it('parado quando atordoado', () => {
    expect(decide(world({ stunned: true }, {}), hard, never).mode).toBe('wait');
  });
});
