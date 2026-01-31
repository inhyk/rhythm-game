import { Game } from './Game';

// Expose game for debugging
declare global {
  interface Window {
    game: Game;
  }
}

interface SongInfo {
  name: string;
  path: string;
  audio?: string;
}

const SONGS: SongInfo[] = [
  { name: 'EDM Demo', path: '/songs/demo/chart.json', audio: '/songs/demo/audio.mp3' },
  { name: 'First Step (EASY)', path: '/songs/easy/chart.json' },
  { name: 'Speed Demon (HARD)', path: '/songs/hard/chart.json' },
  { name: 'Hold Master', path: '/songs/hold-practice/chart.json' },
  { name: 'Hold Legend (HARD)', path: '/songs/hold-advanced/chart.json' },
  { name: 'EDM NIGHTMARE (Lv.12)', path: '/songs/demo-superhard/chart.json' },
];

let currentSongIndex = 0;

const game = new Game();
window.game = game;
let initialized = false;

async function initGame() {
  if (initialized) return;
  initialized = true;

  console.log('Initializing game...');
  await game.init();
  await loadSong(currentSongIndex);
}

async function loadSong(index: number) {
  const song = SONGS[index];
  try {
    await game.loadChart(song.path, song.audio);
    console.log(`Loaded: ${song.name}`);
  } catch (error) {
    console.error('Failed to load:', error);
  }
}

// Handle space key to start/pause
window.addEventListener('keydown', async (e) => {
  if (e.code === 'Space') {
    e.preventDefault();

    // Initialize on first interaction
    if (!initialized) {
      await initGame();
    }

    switch (game.state) {
      case 'ready':
        game.start();
        break;
      case 'playing':
        game.pause();
        break;
      case 'paused':
        game.resume();
        break;
      case 'ended':
        game.reset();
        break;
    }
  }

  // R to reset
  if (e.code === 'KeyR') {
    game.reset();
  }

  // Number keys 1-4 to select song (only when not playing)
  if (game.state === 'ready' || game.state === 'ended' || !initialized) {
    const keyNum = parseInt(e.key);
    if (keyNum >= 1 && keyNum <= SONGS.length) {
      e.preventDefault();
      currentSongIndex = keyNum - 1;
      if (initialized) {
        await loadSong(currentSongIndex);
        console.log(`Selected: ${SONGS[currentSongIndex].name}`);
      }
    }
  }
});

// Also init on click
window.addEventListener('click', initGame, { once: true });

console.log('=== Rhythm Game ===');
console.log('Press SPACE or click to start!');
console.log('');
console.log('Song Selection (press 1-4):');
SONGS.forEach((song, i) => console.log(`  ${i + 1}. ${song.name}`));
