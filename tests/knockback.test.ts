import { describe, expect, it } from 'vitest';
import { blastImpulse, knockbackScale, resolveBump } from '../src/logic/knockback';
import { BUMP } from '../src/config';

const body = (x: number, vx: number, extra = {}) => ({ x, vx, dashing: false, dizzy: 0, ...extra });

describe('resolveBump', () => {
  it('só afasta de leve quando ninguém chega com força', () => {
    const r = resolveBump(body(0, 10), body(20, -10));
    expect(r.winner).toBeNull();
    expect(r.a.vx).toBeLessThan(0);
    expect(r.b.vx).toBeGreaterThan(0);
    expect(r.a.damage + r.b.damage).toBe(0);
  });

  it('quem corre em direção ao outro empurra', () => {
    const r = resolveBump(body(0, 270), body(20, 0));
    expect(r.winner).toBe('a');
    expect(r.b.vx).toBeGreaterThan(BUMP.base);
    expect(r.b.vy).toBeLessThan(0);
    expect(r.b.stunned).toBe(true);
    expect(r.a.vx).toBeLessThan(0); // recuo
  });

  it('funciona dos dois lados', () => {
    const r = resolveBump(body(100, 0), body(80, 270));
    expect(r.winner).toBe('b');
    expect(r.a.vx).toBeGreaterThan(0); // A está à direita e é empurrado para a direita
  });

  it('a investida vence uma corrida normal e causa mais tontura', () => {
    const r = resolveBump(body(0, 200, { dashing: true }), body(20, -270));
    expect(r.winner).toBe('a');
    const plain = resolveBump(body(0, 270), body(20, 0));
    expect(r.b.damage).toBeGreaterThan(plain.b.damage);
  });

  it('tontura aumenta o empurrão', () => {
    const fresh = resolveBump(body(0, 270), body(20, 0));
    const dizzy = resolveBump(body(0, 270), body(20, 0, { dizzy: 120 }));
    expect(Math.abs(dizzy.b.vx)).toBeGreaterThan(Math.abs(fresh.b.vx) * 2);
  });

  it('preso na bolha voa mais longe', () => {
    expect(knockbackScale(0, true)).toBeCloseTo(1.5);
  });
});

describe('blastImpulse', () => {
  it('ignora quem está fora do raio', () => {
    expect(blastImpulse(0, 0, 200, 0, 100, 500, 0)).toBeNull();
  });
  it('joga para longe do centro e para cima', () => {
    const imp = blastImpulse(0, 0, 50, 0, 100, 500, 0)!;
    expect(imp.vx).toBeGreaterThan(0);
    expect(imp.vy).toBeLessThan(0);
  });
  it('é mais forte perto do centro', () => {
    const near = blastImpulse(0, 0, 10, 0, 100, 500, 0)!;
    const far = blastImpulse(0, 0, 90, 0, 100, 500, 0)!;
    expect(Math.hypot(near.vx, near.vy)).toBeGreaterThan(Math.hypot(far.vx, far.vy));
  });
});
