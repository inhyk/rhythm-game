import { Clock } from '../core/Clock';

/**
 * Manages audio playback with precise timing synchronization
 */
export class AudioManager {
  private clock: Clock;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private _isPlaying: boolean = false;
  private _isLoaded: boolean = false;
  private startOffset: number = 0;
  private pauseTime: number = 0;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  async init(): Promise<void> {
    await this.clock.init();
    this.audioContext = this.clock.getAudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  async loadAudio(url: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioManager not initialized');
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this._isLoaded = true;
    } catch (error) {
      console.error('Failed to load audio:', error);
      throw error;
    }
  }

  play(offset: number = 0): void {
    if (this._isPlaying) {
      this.stop();
    }

    this.startOffset = offset;
    this._isPlaying = true;

    // Start the clock regardless of audio
    this.clock.start(offset + this.pauseTime);

    // Only play audio if loaded
    if (this.audioContext && this.audioBuffer && this.gainNode) {
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.gainNode);

      const startTime = Math.max(0, (offset + this.pauseTime) / 1000);
      this.sourceNode.start(0, startTime);

      this.sourceNode.onended = () => {
        if (this._isPlaying) {
          this._isPlaying = false;
        }
      };
    } else {
      console.warn('Playing without audio - clock only mode');
    }
  }

  pause(): void {
    if (!this._isPlaying || !this.sourceNode) return;

    this.pauseTime = this.clock.currentTime - this.startOffset;
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    this.sourceNode = null;
    this._isPlaying = false;
    this.clock.pause();
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Already stopped
      }
      this.sourceNode = null;
    }

    this._isPlaying = false;
    this.pauseTime = 0;
    this.clock.reset();
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  get currentTime(): number {
    return this.clock.currentTime;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  get duration(): number {
    return this.audioBuffer ? this.audioBuffer.duration * 1000 : 0;
  }

  destroy(): void {
    this.stop();
    this.audioBuffer = null;
    this.gainNode?.disconnect();
    this.gainNode = null;
  }
}
