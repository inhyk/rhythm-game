import { Clock } from './core/Clock';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './input/InputManager';
import { AudioManager } from './audio/AudioManager';
import { GameRenderer } from './rendering/GameRenderer';
import { JudgmentSystem } from './systems/JudgmentSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { Note } from './objects/Note';
import type { Chart } from './types/Chart';

type GameState = 'loading' | 'ready' | 'playing' | 'paused' | 'ended';

/**
 * Main game class that orchestrates all systems
 */
export class Game {
  private clock: Clock;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private audioManager: AudioManager;
  private renderer: GameRenderer;
  private judgmentSystem: JudgmentSystem;
  private scoreSystem: ScoreSystem;

  private notes: Note[] = [];
  private chart: Chart | null = null;
  private _state: GameState = 'loading';

  // Track currently holding notes per lane
  private holdingNotes: Map<number, Note> = new Map();

  constructor() {
    this.clock = new Clock();
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager(this.clock);
    this.renderer = new GameRenderer();
    this.judgmentSystem = new JudgmentSystem();
    this.scoreSystem = new ScoreSystem();

    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this)
    );
  }

  private audioInitialized = false;

  async init(): Promise<void> {
    await this.renderer.init();
    this.inputManager.init();

    // Set up input callbacks
    this.inputManager.setKeyDownCallback(this.onKeyDown.bind(this));
    this.inputManager.setKeyUpCallback(this.onKeyUp.bind(this));

    this._state = 'ready';
    console.log('Game initialized');
  }

  // 오디오는 사용자 상호작용 후에 초기화
  async initAudio(): Promise<void> {
    if (this.audioInitialized) return;
    this.audioInitialized = true;
    await this.audioManager.init();
    console.log('Audio initialized');
  }

  async loadChart(chartUrl: string, audioUrl?: string): Promise<void> {
    this._state = 'loading';

    try {
      // Load chart
      const response = await fetch(chartUrl);
      this.chart = await response.json() as Chart;

      // Create notes from chart data
      this.notes = this.chart.notes.map(noteData => new Note(noteData));

      // Load audio if provided (non-blocking)
      if (audioUrl) {
        try {
          await this.audioManager.loadAudio(audioUrl);
          console.log('Audio loaded successfully');
        } catch (audioError) {
          console.warn('Failed to load audio, continuing without sound:', audioError);
        }
      }

      this._state = 'ready';
      this.renderer.showMainScreen();
      console.log(`Loaded chart: ${this.chart.meta.title}`);
    } catch (error) {
      this._state = 'ready'; // Reset state on error
      console.error('Failed to load chart:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this._state !== 'ready' && this._state !== 'paused') {
      console.warn('Cannot start game in current state:', this._state);
      return;
    }

    // 첫 시작 시 오디오 초기화 (사용자 상호작용 필요)
    await this.initAudio();

    this._state = 'playing';
    this.renderer.hideMainScreen();
    this.renderer.hideResultScreen();
    this.gameLoop.start();

    // Start audio with chart offset
    const offset = this.chart?.meta.offset ?? 0;
    this.audioManager.play(offset);

    console.log('Game started');
  }

  pause(): void {
    if (this._state !== 'playing') return;

    this._state = 'paused';
    this.audioManager.pause();
    console.log('Game paused');
  }

  resume(): void {
    if (this._state !== 'paused') return;

    this._state = 'playing';
    this.audioManager.play();
    console.log('Game resumed');
  }

  stop(): void {
    this._state = 'ended';
    this.gameLoop.stop();
    this.audioManager.stop();
    console.log('Game stopped');
  }

  reset(): void {
    this.stop();

    // Reset all notes
    if (this.chart) {
      this.notes = this.chart.notes.map(noteData => new Note(noteData));
    }

    // Clear holding notes
    this.holdingNotes.clear();

    // Reset score
    this.scoreSystem.reset();
    this.renderer.updateScore(0);
    this.renderer.updateCombo(0);

    // Show main screen
    this.renderer.hideResultScreen();
    this.renderer.showMainScreen();

    this._state = 'ready';
    console.log('Game reset');
  }

  private update(_dt: number): void {
    if (this._state !== 'playing') return;

    const currentTime = this.audioManager.currentTime;

    // Update all notes
    for (const note of this.notes) {
      note.updatePosition(currentTime);
    }

    // Check for completed hold notes
    for (const [lane, note] of this.holdingNotes) {
      if (note.holdCompleted) {
        this.scoreSystem.addJudgment({ judgment: 'PERFECT', timeDiff: 0, score: 1000 });
        this.renderer.showJudgment(lane, 'PERFECT');
        this.renderer.removeNoteSprite(note);
        this.holdingNotes.delete(lane);
      }
    }

    // Check for missed notes (only non-holding notes)
    const missedNotes = this.judgmentSystem.checkMissedNotes(this.notes, currentTime);
    for (const note of missedNotes) {
      // Skip if it's a hold note that's currently being held
      if (note.type === 'hold' && this.holdingNotes.get(note.lane) === note) {
        continue;
      }
      this.scoreSystem.miss();
      this.renderer.showJudgment(note.lane, 'MISS');
      this.renderer.removeNoteSprite(note);
    }

    // Clean up hold notes that were missed (processed via updatePosition, not checkMissedNotes)
    for (const note of this.notes) {
      if (note.type === 'hold' && note.isMissed && note.holdSprite) {
        // Don't remove if this note is currently being held
        if (this.holdingNotes.get(note.lane) === note) continue;
        this.renderer.removeNoteSprite(note);
      }
    }

    // Update UI
    this.renderer.updateScore(this.scoreSystem.score);
    this.renderer.updateCombo(this.scoreSystem.combo);

    // Check if song ended
    const lastNoteTime = this.notes.length > 0
      ? Math.max(...this.notes.map(n => n.type === 'hold' ? n.endTime : n.time))
      : 0;
    if (currentTime > lastNoteTime + 2000) {
      this.onSongEnd();
    }
  }

  private render(_interpolation: number): void {
    // Render all active notes (including holding notes)
    for (const note of this.notes) {
      if (note.type === 'tap') {
        if (note.isActive && !note.isProcessed) {
          this.renderer.renderNote(note);
        }
      } else if (note.type === 'hold') {
        // Render hold notes while active or being held
        if ((note.isActive || note.isHolding) && !note.isProcessed) {
          this.renderer.renderNote(note);
        }
      }
    }

    // Update effects
    this.renderer.update();
  }

  private onKeyDown(lane: number): void {
    this.renderer.setLaneHighlight(lane, true);

    if (this._state !== 'playing') return;

    const currentTime = this.audioManager.currentTime;
    const note = this.judgmentSystem.findHittableNote(this.notes, lane, currentTime);

    if (note) {
      const result = this.judgmentSystem.judge(note, currentTime);
      if (result) {
        note.hit();
        this.scoreSystem.addJudgment(result);
        this.renderer.showJudgment(lane, result.judgment);

        if (note.type === 'tap') {
          // Tap note: remove immediately
          this.renderer.removeNoteSprite(note);
        } else if (note.type === 'hold') {
          // Hold note: track it
          this.holdingNotes.set(lane, note);
        }
      }
    }
  }

  private onKeyUp(lane: number): void {
    this.renderer.setLaneHighlight(lane, false);

    if (this._state !== 'playing') return;

    // Check if there's a hold note being held in this lane
    const holdNote = this.holdingNotes.get(lane);
    if (holdNote) {
      const currentTime = this.audioManager.currentTime;
      const success = holdNote.release(currentTime);

      if (success) {
        // Released at the right time
        this.scoreSystem.addJudgment({ judgment: 'PERFECT', timeDiff: 0, score: 500 });
        this.renderer.showJudgment(lane, 'PERFECT');
      } else {
        // Released too early
        this.scoreSystem.miss();
        this.renderer.showJudgment(lane, 'MISS');
      }

      this.renderer.removeNoteSprite(holdNote);
      this.holdingNotes.delete(lane);
    }
  }

  private onSongEnd(): void {
    this._state = 'ended';
    this.gameLoop.stop();

    // Show result screen
    this.renderer.showResultScreen({
      score: this.scoreSystem.score,
      maxCombo: this.scoreSystem.maxCombo,
      accuracy: this.scoreSystem.getAccuracy(),
      grade: this.scoreSystem.getGrade(),
      stats: this.scoreSystem.stats,
    });

    console.log('Song ended!');
    console.log('Final Score:', this.scoreSystem.score);
    console.log('Max Combo:', this.scoreSystem.maxCombo);
    console.log('Accuracy:', this.scoreSystem.getAccuracy().toFixed(2) + '%');
    console.log('Grade:', this.scoreSystem.getGrade());
  }

  get state(): GameState {
    return this._state;
  }

  get score(): number {
    return this.scoreSystem.score;
  }

  get combo(): number {
    return this.scoreSystem.combo;
  }

  // Debug getters
  get debugNotes(): Note[] {
    return this.notes;
  }

  get currentTime(): number {
    return this.audioManager.currentTime;
  }

  destroy(): void {
    this.gameLoop.stop();
    this.inputManager.destroy();
    this.audioManager.destroy();
    this.renderer.destroy();
  }
}
