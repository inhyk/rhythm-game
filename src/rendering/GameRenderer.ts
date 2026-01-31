import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { LAYOUT, PLAY_AREA, getLaneX } from '../config/layout';
import type { Note } from '../objects/Note';
import type { Judgment } from '../types/Chart';

interface JudgmentDisplay {
  text: Text;
  time: number;
  lane: number;
}

interface ResultData {
  score: number;
  maxCombo: number;
  accuracy: number;
  grade: string;
  stats: {
    perfect: number;
    great: number;
    good: number;
    bad: number;
    miss: number;
  };
}

/**
 * Handles all rendering using PixiJS
 */
export class GameRenderer {
  private app: Application;
  private gameContainer: Container;
  private laneContainer: Container;
  private noteContainer: Container;
  private uiContainer: Container;
  private effectContainer: Container;

  private laneHighlights: Graphics[] = [];
  private judgmentDisplays: JudgmentDisplay[] = [];
  private scoreText!: Text;
  private comboText!: Text;

  // Main screen
  private mainScreenContainer: Container;
  // Result screen
  private resultScreenContainer: Container;

  private initialized: boolean = false;

  constructor() {
    this.app = new Application();
    this.gameContainer = new Container();
    this.laneContainer = new Container();
    this.noteContainer = new Container();
    this.uiContainer = new Container();
    this.effectContainer = new Container();
    this.mainScreenContainer = new Container();
    this.resultScreenContainer = new Container();
  }

  async init(): Promise<void> {
    await this.app.init({
      width: LAYOUT.CANVAS_WIDTH,
      height: LAYOUT.CANVAS_HEIGHT,
      backgroundColor: LAYOUT.COLORS.BACKGROUND,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.app.canvas);
    }

    // Set up container hierarchy
    this.app.stage.addChild(this.gameContainer);
    this.gameContainer.addChild(this.laneContainer);
    this.gameContainer.addChild(this.noteContainer);
    this.gameContainer.addChild(this.effectContainer);
    this.gameContainer.addChild(this.uiContainer);

    // Overlay screens (on top of game)
    this.app.stage.addChild(this.mainScreenContainer);
    this.app.stage.addChild(this.resultScreenContainer);

    this.drawLanes();
    this.drawUI();
    this.createMainScreen();
    this.createResultScreen();

    this.initialized = true;
  }

  private drawLanes(): void {
    const { LANE_WIDTH, LANE_GAP, PLAY_AREA_TOP, JUDGMENT_LINE_Y, COLORS } = LAYOUT;

    // Draw lane backgrounds
    for (let i = 0; i < LAYOUT.LANE_COUNT; i++) {
      const x = PLAY_AREA.left + i * (LANE_WIDTH + LANE_GAP);

      // Lane background
      const laneBg = new Graphics();
      laneBg.rect(x, PLAY_AREA_TOP, LANE_WIDTH, JUDGMENT_LINE_Y - PLAY_AREA_TOP);
      laneBg.fill({ color: COLORS.LANE_BG, alpha: 0.8 });
      laneBg.stroke({ color: COLORS.LANE_BORDER, width: 2 });
      this.laneContainer.addChild(laneBg);

      // Lane highlight (for key press feedback)
      const highlight = new Graphics();
      highlight.rect(x, PLAY_AREA_TOP, LANE_WIDTH, JUDGMENT_LINE_Y - PLAY_AREA_TOP);
      highlight.fill({ color: COLORS.NOTE_COLORS[i], alpha: 0.3 });
      highlight.visible = false;
      this.laneContainer.addChild(highlight);
      this.laneHighlights.push(highlight);
    }

    // Draw judgment line
    const judgmentLine = new Graphics();
    judgmentLine.rect(PLAY_AREA.left - 5, JUDGMENT_LINE_Y - 3, PLAY_AREA.width + 10, 6);
    judgmentLine.fill({ color: COLORS.JUDGMENT_LINE });
    this.laneContainer.addChild(judgmentLine);

    // Draw key labels
    const keyLabels = ['D', 'F', 'J', 'K'];
    const labelStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: COLORS.TEXT,
    });

    for (let i = 0; i < LAYOUT.LANE_COUNT; i++) {
      const x = getLaneX(i);
      const label = new Text({ text: keyLabels[i], style: labelStyle });
      label.anchor.set(0.5);
      label.position.set(x, JUDGMENT_LINE_Y + 30);
      this.laneContainer.addChild(label);
    }
  }

  private drawUI(): void {
    const { COLORS } = LAYOUT;

    // Score display
    const scoreStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 28,
      fontWeight: 'bold',
      fill: COLORS.TEXT,
    });

    this.scoreText = new Text({ text: 'SCORE: 0', style: scoreStyle });
    this.scoreText.position.set(20, 15);
    this.uiContainer.addChild(this.scoreText);

    // Combo display
    const comboStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: COLORS.TEXT,
    });

    this.comboText = new Text({ text: '', style: comboStyle });
    this.comboText.anchor.set(1, 0);
    this.comboText.position.set(LAYOUT.CANVAS_WIDTH - 20, 15);
    this.uiContainer.addChild(this.comboText);
  }

  setLaneHighlight(lane: number, active: boolean): void {
    if (this.laneHighlights[lane]) {
      this.laneHighlights[lane].visible = active;
    }
  }

  updateScore(score: number): void {
    this.scoreText.text = `SCORE: ${score.toLocaleString()}`;
  }

  updateCombo(combo: number): void {
    if (combo > 1) {
      this.comboText.text = `COMBO: ${combo}`;
    } else {
      this.comboText.text = '';
    }
  }

  renderNote(note: Note): void {
    if (note.type === 'tap') {
      this.renderTapNote(note);
    } else if (note.type === 'hold') {
      this.renderHoldNote(note);
    }
  }

  private renderTapNote(note: Note): void {
    if (!note.sprite) {
      this.createTapNoteSprite(note);
    }

    if (note.sprite) {
      note.sprite.position.y = note.y;
      note.sprite.visible = note.isActive;
    }
  }

  private renderHoldNote(note: Note): void {
    if (!note.holdSprite) {
      this.createHoldNoteSprite(note);
    }

    if (note.holdSprite) {
      // Update position and redraw hold body
      this.updateHoldNoteSprite(note);
      note.holdSprite.visible = note.isActive || note.isHolding;
    }
  }

  private createTapNoteSprite(note: Note): void {
    const { LANE_WIDTH, NOTE_HEIGHT, COLORS } = LAYOUT;
    const x = getLaneX(note.lane);

    const graphics = new Graphics();
    graphics.roundRect(
      -LANE_WIDTH / 2 + 4,
      -NOTE_HEIGHT / 2,
      LANE_WIDTH - 8,
      NOTE_HEIGHT,
      6
    );
    graphics.fill({ color: COLORS.NOTE_COLORS[note.lane] });

    graphics.position.set(x, note.y);
    note.sprite = graphics;
    this.noteContainer.addChild(graphics);
  }

  private createHoldNoteSprite(note: Note): void {
    const x = getLaneX(note.lane);

    const container = new Container();
    container.position.set(x, 0);
    note.holdSprite = container;
    this.noteContainer.addChild(container);

    // Create child graphics for body
    const body = new Graphics();
    body.name = 'body';
    container.addChild(body);

    // Create head (start)
    const head = new Graphics();
    head.name = 'head';
    container.addChild(head);

    // Create tail (end)
    const tail = new Graphics();
    tail.name = 'tail';
    container.addChild(tail);

    this.updateHoldNoteSprite(note);
  }

  private updateHoldNoteSprite(note: Note): void {
    if (!note.holdSprite) return;

    const { LANE_WIDTH, NOTE_HEIGHT, COLORS, JUDGMENT_LINE_Y } = LAYOUT;
    const color = COLORS.NOTE_COLORS[note.lane];
    const holdColor = this.adjustColorBrightness(color, 0.7);

    const body = note.holdSprite.getChildByName('body') as Graphics;
    const head = note.holdSprite.getChildByName('head') as Graphics;
    const tail = note.holdSprite.getChildByName('tail') as Graphics;

    // Calculate positions
    let headY = note.y;
    let tailY = note.endY;

    // Clamp to judgment line when holding
    if (note.isHolding) {
      headY = Math.max(headY, JUDGMENT_LINE_Y);
    }

    // Body (the long part)
    body.clear();
    const bodyHeight = headY - tailY;
    if (bodyHeight > 0) {
      body.rect(
        -LANE_WIDTH / 2 + 8,
        tailY,
        LANE_WIDTH - 16,
        bodyHeight
      );
      body.fill({ color: holdColor, alpha: note.isHolding ? 1 : 0.8 });
    }

    // Head (bottom, at judgment time)
    head.clear();
    head.roundRect(
      -LANE_WIDTH / 2 + 4,
      headY - NOTE_HEIGHT / 2,
      LANE_WIDTH - 8,
      NOTE_HEIGHT,
      6
    );
    head.fill({ color: note.isHolding ? 0xffffff : color });

    // Tail (top, at end time)
    tail.clear();
    tail.roundRect(
      -LANE_WIDTH / 2 + 6,
      tailY - NOTE_HEIGHT / 2,
      LANE_WIDTH - 12,
      NOTE_HEIGHT,
      4
    );
    tail.fill({ color: holdColor });
  }

  private adjustColorBrightness(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  removeNoteSprite(note: Note): void {
    if (note.sprite && note.sprite.parent) {
      note.sprite.parent.removeChild(note.sprite);
      note.sprite.destroy();
      note.sprite = null;
    }
    if (note.holdSprite && note.holdSprite.parent) {
      note.holdSprite.parent.removeChild(note.holdSprite);
      note.holdSprite.destroy({ children: true });
      note.holdSprite = null;
    }
  }

  showJudgment(lane: number, judgment: Judgment): void {
    const { COLORS, JUDGMENT_LINE_Y } = LAYOUT;
    const x = getLaneX(lane);

    const colorMap: Record<Judgment, number> = {
      PERFECT: COLORS.PERFECT,
      GREAT: COLORS.GREAT,
      GOOD: COLORS.GOOD,
      BAD: COLORS.BAD,
      MISS: COLORS.MISS,
    };

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      fill: colorMap[judgment],
      dropShadow: {
        color: 0x000000,
        blur: 2,
        distance: 1,
      },
    });

    const text = new Text({ text: judgment, style });
    text.anchor.set(0.5);
    text.position.set(x, JUDGMENT_LINE_Y - 50);
    this.effectContainer.addChild(text);

    this.judgmentDisplays.push({
      text,
      time: performance.now(),
      lane,
    });
  }

  update(): void {
    // Update judgment displays (fade out)
    const now = performance.now();
    const fadeTime = 500; // ms

    for (let i = this.judgmentDisplays.length - 1; i >= 0; i--) {
      const display = this.judgmentDisplays[i];
      const elapsed = now - display.time;

      if (elapsed > fadeTime) {
        display.text.parent?.removeChild(display.text);
        display.text.destroy();
        this.judgmentDisplays.splice(i, 1);
      } else {
        const progress = elapsed / fadeTime;
        display.text.alpha = 1 - progress;
        display.text.position.y -= 0.5; // Float up
      }
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  // ===== Main Screen =====
  private createMainScreen(): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } = LAYOUT;

    // Semi-transparent background
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    this.mainScreenContainer.addChild(bg);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: 'bold',
      fill: COLORS.JUDGMENT_LINE,
      dropShadow: { color: 0x000000, blur: 4, distance: 2 },
    });
    const title = new Text({ text: '🎵 Rhythm Game', style: titleStyle });
    title.anchor.set(0.5);
    title.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);
    this.mainScreenContainer.addChild(title);

    // Instructions
    const instructionStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: COLORS.TEXT,
    });
    const instructions = new Text({
      text: 'Press SPACE to Start',
      style: instructionStyle,
    });
    instructions.anchor.set(0.5);
    instructions.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    this.mainScreenContainer.addChild(instructions);

    // Key guide
    const keyGuideStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fill: 0xaaaaaa,
    });
    const keyGuide = new Text({
      text: 'Keys: D  F  J  K',
      style: keyGuideStyle,
    });
    keyGuide.anchor.set(0.5);
    keyGuide.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    this.mainScreenContainer.addChild(keyGuide);

    this.mainScreenContainer.visible = true;
  }

  showMainScreen(): void {
    this.mainScreenContainer.visible = true;
    this.resultScreenContainer.visible = false;
  }

  hideMainScreen(): void {
    this.mainScreenContainer.visible = false;
  }

  // ===== Result Screen =====
  private createResultScreen(): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = LAYOUT;

    // Semi-transparent background
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.fill({ color: 0x000000, alpha: 0.9 });
    bg.name = 'bg';
    this.resultScreenContainer.addChild(bg);

    this.resultScreenContainer.visible = false;
  }

  showResultScreen(data: ResultData): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } = LAYOUT;

    // Clear previous content except background
    while (this.resultScreenContainer.children.length > 1) {
      this.resultScreenContainer.removeChildAt(1);
    }

    // Grade (big)
    const gradeColors: Record<string, number> = {
      S: 0xffd700,
      A: 0x00ff00,
      B: 0x00bfff,
      C: 0xffaa00,
      D: 0xff6600,
      F: 0xff0000,
    };
    const gradeStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 120,
      fontWeight: 'bold',
      fill: gradeColors[data.grade] || COLORS.TEXT,
      dropShadow: { color: 0x000000, blur: 8, distance: 4 },
    });
    const gradeText = new Text({ text: data.grade, style: gradeStyle });
    gradeText.anchor.set(0.5);
    gradeText.position.set(CANVAS_WIDTH / 2, 140);
    this.resultScreenContainer.addChild(gradeText);

    // Score
    const scoreStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: 'bold',
      fill: COLORS.TEXT,
    });
    const scoreText = new Text({
      text: `Score: ${data.score.toLocaleString()}`,
      style: scoreStyle,
    });
    scoreText.anchor.set(0.5);
    scoreText.position.set(CANVAS_WIDTH / 2, 240);
    this.resultScreenContainer.addChild(scoreText);

    // Accuracy & Max Combo
    const infoStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: COLORS.TEXT,
    });
    const accuracyText = new Text({
      text: `Accuracy: ${data.accuracy.toFixed(2)}%`,
      style: infoStyle,
    });
    accuracyText.anchor.set(0.5);
    accuracyText.position.set(CANVAS_WIDTH / 2, 290);
    this.resultScreenContainer.addChild(accuracyText);

    const comboText = new Text({
      text: `Max Combo: ${data.maxCombo}`,
      style: infoStyle,
    });
    comboText.anchor.set(0.5);
    comboText.position.set(CANVAS_WIDTH / 2, 325);
    this.resultScreenContainer.addChild(comboText);

    // Stats
    const statsY = 380;
    const statsGap = 30;
    const statItems = [
      { label: 'PERFECT', value: data.stats.perfect, color: COLORS.PERFECT },
      { label: 'GREAT', value: data.stats.great, color: COLORS.GREAT },
      { label: 'GOOD', value: data.stats.good, color: COLORS.GOOD },
      { label: 'BAD', value: data.stats.bad, color: COLORS.BAD },
      { label: 'MISS', value: data.stats.miss, color: COLORS.MISS },
    ];

    statItems.forEach((item, i) => {
      const statStyle = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 20,
        fill: item.color,
      });
      const statText = new Text({
        text: `${item.label}: ${item.value}`,
        style: statStyle,
      });
      statText.anchor.set(0.5);
      statText.position.set(CANVAS_WIDTH / 2, statsY + i * statsGap);
      this.resultScreenContainer.addChild(statText);
    });

    // Restart instruction
    const restartStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xaaaaaa,
    });
    const restartText = new Text({
      text: 'Press SPACE to Retry',
      style: restartStyle,
    });
    restartText.anchor.set(0.5);
    restartText.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
    this.resultScreenContainer.addChild(restartText);

    this.resultScreenContainer.visible = true;
    this.mainScreenContainer.visible = false;
  }

  hideResultScreen(): void {
    this.resultScreenContainer.visible = false;
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }
}
