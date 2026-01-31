/**
 * High-precision clock for rhythm game synchronization
 * Uses performance.now() for consistent timing
 */
export class Clock {
  private audioContext: AudioContext | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private _isRunning: boolean = false;
  private offset: number = 0;

  constructor() {
    // AudioContext will be created on first user interaction
  }

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  start(offset: number = 0): void {
    if (this._isRunning) return;

    this.offset = offset;
    if (this.pauseTime > 0) {
      // Resume from pause
      const pausedDuration = this.pauseTime - this.startTime;
      this.startTime = performance.now() - pausedDuration;
    } else {
      // Fresh start
      this.startTime = performance.now();
    }
    this._isRunning = true;
    this.pauseTime = 0;
  }

  pause(): void {
    if (!this._isRunning) return;
    this.pauseTime = performance.now();
    this._isRunning = false;
  }

  reset(): void {
    this.startTime = 0;
    this.pauseTime = 0;
    this._isRunning = false;
    this.offset = 0;
  }

  /**
   * Get current time in milliseconds since clock start
   */
  get currentTime(): number {
    if (!this._isRunning) {
      if (this.pauseTime > 0) {
        return (this.pauseTime - this.startTime) + this.offset;
      }
      return this.offset;
    }
    return (performance.now() - this.startTime) + this.offset;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }
}
