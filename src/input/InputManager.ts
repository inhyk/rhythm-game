import { LAYOUT } from '../config/layout';

type KeyCallback = (lane: number) => void;

/**
 * Handles keyboard input for the rhythm game
 * Maps keys to lanes and provides callbacks for key events
 */
export class InputManager {
  private keyState: Map<string, boolean> = new Map();
  private laneState: boolean[] = [false, false, false, false];
  private onKeyDown: KeyCallback | null = null;
  private onKeyUp: KeyCallback | null = null;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
  }

  init(): void {
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
  }

  setKeyDownCallback(callback: KeyCallback): void {
    this.onKeyDown = callback;
  }

  setKeyUpCallback(callback: KeyCallback): void {
    this.onKeyUp = callback;
  }

  isLanePressed(lane: number): boolean {
    return this.laneState[lane] ?? false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return; // Ignore key repeat

    const lane = this.getLaneFromKey(e.code);
    if (lane !== -1) {
      e.preventDefault();

      if (!this.laneState[lane]) {
        this.laneState[lane] = true;
        this.keyState.set(e.code, true);
        this.onKeyDown?.(lane);
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const lane = this.getLaneFromKey(e.code);
    if (lane !== -1) {
      e.preventDefault();

      this.keyState.set(e.code, false);

      // Check if any key for this lane is still pressed
      const laneKeys = this.getLaneKeys(lane);
      const anyPressed = laneKeys.some(key => this.keyState.get(key));

      if (!anyPressed) {
        this.laneState[lane] = false;
        this.onKeyUp?.(lane);
      }
    }
  }

  private getLaneFromKey(code: string): number {
    const bindings = LAYOUT.KEY_BINDINGS;
    if (bindings.LANE_0.includes(code as never)) return 0;
    if (bindings.LANE_1.includes(code as never)) return 1;
    if (bindings.LANE_2.includes(code as never)) return 2;
    if (bindings.LANE_3.includes(code as never)) return 3;
    return -1;
  }

  private getLaneKeys(lane: number): string[] {
    const bindings = LAYOUT.KEY_BINDINGS;
    switch (lane) {
      case 0: return [...bindings.LANE_0];
      case 1: return [...bindings.LANE_1];
      case 2: return [...bindings.LANE_2];
      case 3: return [...bindings.LANE_3];
      default: return [];
    }
  }
}
