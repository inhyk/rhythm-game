import type { Graphics, Container } from 'pixi.js';
import type { NoteData, NoteType } from '../types/Chart';
import { LAYOUT } from '../config/layout';

/**
 * Represents a single note in the game
 */
export class Note {
  readonly time: number; // Hit time in ms
  readonly lane: number; // 0-3
  readonly type: NoteType;
  readonly duration: number; // For hold notes
  readonly endTime: number; // End time for hold notes

  private _y: number = -50; // Start above screen
  private _endY: number = -50; // End position for hold notes
  private _isActive: boolean = false;
  private _isHit: boolean = false;
  private _isMissed: boolean = false;
  private _isHolding: boolean = false; // Currently being held
  private _holdCompleted: boolean = false; // Hold successfully completed

  sprite: Graphics | null = null;
  holdSprite: Container | null = null; // Container for hold note body

  constructor(data: NoteData) {
    this.time = data.time;
    this.lane = data.lane;
    this.type = data.type;
    this.duration = data.duration ?? 0;
    this.endTime = this.time + this.duration;
  }

  /**
   * Update note position based on current game time
   */
  updatePosition(currentTime: number): void {
    const { JUDGMENT_LINE_Y, NOTE_FALL_SPEED, NOTE_SPAWN_OFFSET } = LAYOUT;

    // Calculate Y position based on time difference
    const timeDiff = this.time - currentTime;
    this._y = JUDGMENT_LINE_Y - (timeDiff * NOTE_FALL_SPEED);

    // For hold notes, calculate end position
    if (this.type === 'hold') {
      const endTimeDiff = this.endTime - currentTime;
      this._endY = JUDGMENT_LINE_Y - (endTimeDiff * NOTE_FALL_SPEED);
    }

    // Activate when entering play area
    if (timeDiff <= NOTE_SPAWN_OFFSET && !this._isHit && !this._isMissed) {
      this._isActive = true;
    }

    // For tap notes: miss if passed judgment line
    if (this.type === 'tap') {
      if (timeDiff < -200 && !this._isHit) {
        this._isMissed = true;
        this._isActive = false;
      }
    }

    // For hold notes: different miss logic
    if (this.type === 'hold') {
      // Miss if start was missed
      if (timeDiff < -200 && !this._isHit && !this._isHolding) {
        this._isMissed = true;
        this._isActive = false;
      }
      // Check if hold is complete
      if (this._isHolding && currentTime >= this.endTime) {
        this._holdCompleted = true;
        this._isActive = false;
      }
    }
  }

  /**
   * Mark note as hit (start of hold for hold notes)
   */
  hit(): void {
    this._isHit = true;
    if (this.type === 'tap') {
      this._isActive = false;
    } else if (this.type === 'hold') {
      this._isHolding = true;
    }
  }

  /**
   * Release hold note
   */
  release(currentTime: number): boolean {
    if (this.type !== 'hold' || !this._isHolding) return false;

    this._isHolding = false;

    // Check if released too early
    const remainingTime = this.endTime - currentTime;
    if (remainingTime > 200) {
      // Released too early - partial completion
      this._isActive = false;
      return false;
    }

    // Successfully completed
    this._holdCompleted = true;
    this._isActive = false;
    return true;
  }

  /**
   * Mark note as missed
   */
  miss(): void {
    this._isMissed = true;
    this._isActive = false;
    this._isHolding = false;
  }

  get y(): number {
    return this._y;
  }

  get endY(): number {
    return this._endY;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isHit(): boolean {
    return this._isHit;
  }

  get isMissed(): boolean {
    return this._isMissed;
  }

  get isHolding(): boolean {
    return this._isHolding;
  }

  get holdCompleted(): boolean {
    return this._holdCompleted;
  }

  get isProcessed(): boolean {
    if (this.type === 'tap') {
      return this._isHit || this._isMissed;
    }
    // Hold notes are processed when completed or missed
    return this._holdCompleted || this._isMissed;
  }

  /**
   * Get the height of the hold note body in pixels
   */
  get holdHeight(): number {
    if (this.type !== 'hold') return 0;
    return this.duration * LAYOUT.NOTE_FALL_SPEED;
  }
}
