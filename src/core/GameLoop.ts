import { LAYOUT } from '../config/layout';

type UpdateCallback = (dt: number) => void;
type RenderCallback = (interpolation: number) => void;

/**
 * Fixed timestep game loop
 * Ensures consistent physics/logic updates regardless of frame rate
 */
export class GameLoop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number = 0;
  private _isRunning: boolean = false;

  private onUpdate: UpdateCallback;
  private onRender: RenderCallback;

  private readonly timestep: number = LAYOUT.FIXED_TIMESTEP;
  private readonly maxAccumulator: number = this.timestep * 5; // Prevent spiral of death

  constructor(onUpdate: UpdateCallback, onRender: RenderCallback) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
  }

  start(): void {
    if (this._isRunning) return;

    this._isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop();
  }

  stop(): void {
    this._isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  private loop = (): void => {
    if (!this._isRunning) return;

    const currentTime = performance.now();
    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap frame time to prevent spiral of death
    if (frameTime > this.maxAccumulator) {
      frameTime = this.maxAccumulator;
    }

    this.accumulator += frameTime;

    // Fixed timestep updates
    while (this.accumulator >= this.timestep) {
      this.onUpdate(this.timestep);
      this.accumulator -= this.timestep;
    }

    // Render with interpolation
    const interpolation = this.accumulator / this.timestep;
    this.onRender(interpolation);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
