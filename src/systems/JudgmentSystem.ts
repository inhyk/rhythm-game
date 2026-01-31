import type { Judgment, JudgmentResult } from '../types/Chart';
import type { Note } from '../objects/Note';

interface JudgmentWindow {
  judgment: Judgment;
  window: number; // ms
  score: number;
}

/**
 * Handles timing judgment for note hits
 */
export class JudgmentSystem {
  private static readonly JUDGMENT_WINDOWS: JudgmentWindow[] = [
    { judgment: 'PERFECT', window: 25, score: 1000 },
    { judgment: 'GREAT', window: 50, score: 800 },
    { judgment: 'GOOD', window: 100, score: 500 },
    { judgment: 'BAD', window: 150, score: 200 },
  ];

  private static readonly MISS_WINDOW = 200;

  /**
   * Judge a note based on timing difference
   */
  judge(note: Note, currentTime: number): JudgmentResult | null {
    const timeDiff = Math.abs(currentTime - note.time);

    for (const { judgment, window, score } of JudgmentSystem.JUDGMENT_WINDOWS) {
      if (timeDiff <= window) {
        return {
          judgment,
          timeDiff: currentTime - note.time,
          score,
        };
      }
    }

    // If pressed but outside all windows (but within miss window)
    if (timeDiff <= JudgmentSystem.MISS_WINDOW) {
      return {
        judgment: 'BAD',
        timeDiff: currentTime - note.time,
        score: 200,
      };
    }

    return null;
  }

  /**
   * Find the closest note to hit in a lane
   */
  findHittableNote(notes: Note[], lane: number, currentTime: number): Note | null {
    let closestNote: Note | null = null;
    let closestDiff = Infinity;

    for (const note of notes) {
      if (note.lane !== lane || note.isProcessed) continue;

      const timeDiff = Math.abs(currentTime - note.time);
      if (timeDiff <= JudgmentSystem.MISS_WINDOW && timeDiff < closestDiff) {
        closestDiff = timeDiff;
        closestNote = note;
      }
    }

    return closestNote;
  }

  /**
   * Check for notes that should be marked as missed
   */
  checkMissedNotes(notes: Note[], currentTime: number): Note[] {
    const missedNotes: Note[] = [];

    for (const note of notes) {
      if (note.isProcessed) continue;

      // Skip hold notes that have been hit (they're being held)
      if (note.type === 'hold' && note.isHit) continue;

      const timeDiff = currentTime - note.time;
      if (timeDiff > JudgmentSystem.MISS_WINDOW) {
        note.miss();
        missedNotes.push(note);
      }
    }

    return missedNotes;
  }

  /**
   * Check if a judgment is considered a hit (not a miss/bad)
   */
  static isHit(judgment: Judgment): boolean {
    return judgment === 'PERFECT' || judgment === 'GREAT' || judgment === 'GOOD';
  }
}
