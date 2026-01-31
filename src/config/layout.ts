// Game layout configuration
export const LAYOUT = {
  // Canvas dimensions
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  // Play area
  LANE_COUNT: 4,
  LANE_WIDTH: 80,
  LANE_GAP: 4,
  PLAY_AREA_TOP: 60, // Space for UI
  JUDGMENT_LINE_Y: 520, // Y position of judgment line

  // Notes
  NOTE_HEIGHT: 20,
  NOTE_FALL_SPEED: 0.5, // pixels per millisecond
  NOTE_SPAWN_OFFSET: 2000, // spawn notes 2s before hit time

  // Timing
  FIXED_TIMESTEP: 1000 / 60, // 60 FPS

  // Colors
  COLORS: {
    BACKGROUND: 0x1a1a2e,
    LANE_BG: 0x16213e,
    LANE_BORDER: 0x0f3460,
    JUDGMENT_LINE: 0xe94560,
    NOTE_COLORS: [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3],
    TEXT: 0xffffff,
    PERFECT: 0xffd700,
    GREAT: 0x00ff00,
    GOOD: 0x00bfff,
    BAD: 0xff8c00,
    MISS: 0xff0000,
  },

  // Key bindings
  KEY_BINDINGS: {
    LANE_0: ['KeyD', 'ArrowLeft'],
    LANE_1: ['KeyF', 'ArrowDown'],
    LANE_2: ['KeyJ', 'ArrowUp'],
    LANE_3: ['KeyK', 'ArrowRight'],
  },
} as const;

// Calculate derived values
export const PLAY_AREA = {
  get width() {
    return LAYOUT.LANE_COUNT * LAYOUT.LANE_WIDTH + (LAYOUT.LANE_COUNT - 1) * LAYOUT.LANE_GAP;
  },
  get left() {
    return (LAYOUT.CANVAS_WIDTH - this.width) / 2;
  },
  get right() {
    return this.left + this.width;
  },
};

export function getLaneX(lane: number): number {
  return PLAY_AREA.left + lane * (LAYOUT.LANE_WIDTH + LAYOUT.LANE_GAP) + LAYOUT.LANE_WIDTH / 2;
}
