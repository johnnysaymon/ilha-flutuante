import { describe, expect, it } from 'vitest';
import { JumpDetector, lateralTilt, normalizeAngle, pitchRate, tiltToAxis } from '../src/logic/tilt';

describe('lateralTilt', () => {
  it('usa gamma em retrato e beta em paisagem', () => {
    expect(lateralTilt(10, 20, 0)).toBe(20);
    expect(lateralTilt(10, 20, 90)).toBe(10);
    expect(lateralTilt(10, 20, 270)).toBe(-10);
    expect(lateralTilt(10, 20, -90)).toBe(-10);
    expect(lateralTilt(10, 20, 180)).toBe(-20);
  });
});

describe('tiltToAxis', () => {
  it('tem zona morta', () => {
    expect(tiltToAxis(3)).toBe(0);
    expect(tiltToAxis(-3)).toBe(0);
  });
  it('satura em ±1', () => {
    expect(tiltToAxis(40)).toBe(1);
    expect(tiltToAxis(-40)).toBe(-1);
  });
  it('é proporcional no meio', () => {
    const v = tiltToAxis(11);
    expect(v).toBeGreaterThan(0.3);
    expect(v).toBeLessThan(0.7);
  });
  it('normaliza voltas', () => {
    expect(normalizeAngle(350)).toBe(-10);
    expect(tiltToAxis(357)).toBe(0);
  });
});

describe('pitchRate', () => {
  it('escolhe o eixo do giroscópio conforme a orientação', () => {
    const r = { alpha: 1, beta: 2, gamma: 3 };
    expect(pitchRate(r, 0)).toBe(2);
    expect(pitchRate(r, 90)).toBe(3);
  });
});

describe('JumpDetector', () => {
  it('detecta puxão e respeita a recarga', () => {
    const d = new JumpDetector({ rateThreshold: 150, accelThreshold: 12, cooldownMs: 300 });
    expect(d.sample(0, 20, 1)).toBe(false);
    expect(d.sample(10, 200, 0)).toBe(true);
    expect(d.sample(100, 200, 0)).toBe(false);
    expect(d.sample(400, 0, 15)).toBe(true);
  });
});
