import type { Judgment, JudgmentResult } from '../types/Chart';
import { JudgmentSystem } from './JudgmentSystem';

interface ScoreStats {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
}

/**
 * Manages score, combo, and statistics
 */
export class ScoreSystem {
  private _score: number = 0;
  private _combo: number = 0;
  private _maxCombo: number = 0;
  private _stats: ScoreStats = {
    perfect: 0,
    great: 0,
    good: 0,
    bad: 0,
    miss: 0,
  };

  /**
   * Add score from a judgment
   */
  addJudgment(result: JudgmentResult): void {
    const { judgment, score } = result;

    // Update stats
    this.updateStats(judgment);

    if (JudgmentSystem.isHit(judgment)) {
      // Increment combo
      this._combo++;
      if (this._combo > this._maxCombo) {
        this._maxCombo = this._combo;
      }

      // Calculate score with combo multiplier
      const comboMultiplier = this.getComboMultiplier();
      this._score += Math.floor(score * comboMultiplier);
    } else {
      // Break combo on bad/miss
      this._combo = 0;
      this._score += score;
    }
  }

  /**
   * Handle a miss (note passed without being hit)
   */
  miss(): void {
    this._stats.miss++;
    this._combo = 0;
  }

  private updateStats(judgment: Judgment): void {
    switch (judgment) {
      case 'PERFECT':
        this._stats.perfect++;
        break;
      case 'GREAT':
        this._stats.great++;
        break;
      case 'GOOD':
        this._stats.good++;
        break;
      case 'BAD':
        this._stats.bad++;
        break;
      case 'MISS':
        this._stats.miss++;
        break;
    }
  }

  private getComboMultiplier(): number {
    if (this._combo >= 100) return 2.0;
    if (this._combo >= 50) return 1.5;
    if (this._combo >= 25) return 1.25;
    if (this._combo >= 10) return 1.1;
    return 1.0;
  }

  /**
   * Calculate accuracy percentage
   */
  getAccuracy(): number {
    const total =
      this._stats.perfect +
      this._stats.great +
      this._stats.good +
      this._stats.bad +
      this._stats.miss;

    if (total === 0) return 100;

    const weighted =
      this._stats.perfect * 100 +
      this._stats.great * 80 +
      this._stats.good * 50 +
      this._stats.bad * 20 +
      this._stats.miss * 0;

    return weighted / total;
  }

  /**
   * Get letter grade based on accuracy
   */
  getGrade(): string {
    const accuracy = this.getAccuracy();
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 70) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
  }

  reset(): void {
    this._score = 0;
    this._combo = 0;
    this._maxCombo = 0;
    this._stats = {
      perfect: 0,
      great: 0,
      good: 0,
      bad: 0,
      miss: 0,
    };
  }

  get score(): number {
    return this._score;
  }

  get combo(): number {
    return this._combo;
  }

  get maxCombo(): number {
    return this._maxCombo;
  }

  get stats(): Readonly<ScoreStats> {
    return this._stats;
  }
}
