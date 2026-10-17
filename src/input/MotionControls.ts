import Phaser from 'phaser';
import type { ControlState, Controller } from './Controls';
import { JumpDetector, lateralTilt, normalizeAngle, pitchRate, tiltToAxis } from '../logic/tilt';

type PermissionCapable = { requestPermission?: () => Promise<'granted' | 'denied'> };

export function motionSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

/**
 * No iOS os sensores só são liberados depois de um toque do usuário.
 * Deve ser chamado dentro de um evento de toque/clique.
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (!motionSupported()) return false;
  try {
    const orientation = window.DeviceOrientationEvent as unknown as PermissionCapable;
    const motion = (window as unknown as { DeviceMotionEvent?: PermissionCapable }).DeviceMotionEvent;
    const results = await Promise.all([
      orientation.requestPermission ? orientation.requestPermission() : 'granted',
      motion?.requestPermission ? motion.requestPermission() : 'granted',
    ]);
    return results.every((r) => r === 'granted');
  } catch {
    return false;
  }
}

function screenAngle(): number {
  const o = window.screen?.orientation;
  if (o && typeof o.angle === 'number') return o.angle;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

/**
 * Inclinar o celular para os lados anda; um puxão rápido (giro para frente/trás) pula;
 * tocar na tela usa o poder (ou faz a investida, se não houver poder).
 */
export class MotionControls implements Controller {
  readonly fireDashesWhenEmpty = true;
  private tilt = 0;
  private neutral = 0;
  private gotData = false;
  private jumpQueued = false;
  private fireQueued = false;
  private detector = new JumpDetector();

  private onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    this.tilt = lateralTilt(e.beta, e.gamma, screenAngle());
    if (!this.gotData) {
      this.gotData = true;
      this.neutral = this.tilt;
    }
  };

  private onMotion = (e: DeviceMotionEvent) => {
    const r = e.rotationRate;
    const rate = r ? pitchRate({ alpha: r.alpha ?? 0, beta: r.beta ?? 0, gamma: r.gamma ?? 0 }, screenAngle()) : 0;
    const a = e.acceleration;
    const accel = a ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : 0;
    if (this.detector.sample(performance.now(), rate, accel)) this.jumpQueued = true;
  };

  private onPointer = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
    if (over.length > 0) return; // toque em botão da interface
    void pointer;
    this.fireQueued = true;
  };

  constructor(private scene: Phaser.Scene) {
    window.addEventListener('deviceorientation', this.onOrientation);
    window.addEventListener('devicemotion', this.onMotion);
    scene.input.on('pointerdown', this.onPointer);
  }

  get hasSensorData(): boolean {
    return this.gotData;
  }

  /** Define a posição atual do celular como "parado". */
  calibrate(): void {
    this.neutral = this.tilt;
  }

  onRoundStart(): void {
    this.calibrate();
  }

  read(): ControlState {
    const move = tiltToAxis(normalizeAngle(this.tilt - this.neutral));
    const fire = this.fireQueued;
    const jump = this.jumpQueued;
    this.fireQueued = false;
    this.jumpQueued = false;
    // Sem poder, o toque vira investida — a cena decide (fire → dash se não houver carga).
    return { move, jump, dash: false, fire };
  }

  destroy(): void {
    window.removeEventListener('deviceorientation', this.onOrientation);
    window.removeEventListener('devicemotion', this.onMotion);
    this.scene.input.off('pointerdown', this.onPointer);
  }
}
