export type NoteType = 'tap' | 'hold';

export interface NoteData {
  time: number; // milliseconds
  lane: number; // 0-3
  type: NoteType;
  duration?: number; // for hold notes (ms)
}

export interface ChartMeta {
  title: string;
  artist: string;
  bpm: number;
  offset: number; // ms offset for audio sync
  difficulty: string;
  level: number;
  audioFile: string;
}

export interface Chart {
  version: string;
  meta: ChartMeta;
  notes: NoteData[];
}

export type Judgment = 'PERFECT' | 'GREAT' | 'GOOD' | 'BAD' | 'MISS';

export interface JudgmentResult {
  judgment: Judgment;
  timeDiff: number; // ms difference from perfect timing
  score: number;
}
