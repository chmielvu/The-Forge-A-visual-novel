// utils/safeAudio.ts  ← 2025 SOTA fix
let userHasInteracted = false;
let pendingTracks: HTMLAudioElement[] = [];

// Detect first user interaction (click, tap, keypress)
const unlockAudio = () => {
  if (userHasInteracted) return;
  userHasInteracted = true;

  // Unblock every pending track
  pendingTracks.forEach(track => {
    track.play().catch(() => {}); // silently ignore if still blocked
  });
  pendingTracks = [];

  // Remove listeners after first unlock
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('keydown', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
};

// Listeners for interaction
if (typeof window !== 'undefined') {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
}

// Safe play function — use this everywhere instead of new Audio().play()
export const safePlay = (src: string, volume = 0.4, loop = true): HTMLAudioElement => {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = 'auto';

  if (userHasInteracted) {
    audio.play().catch(() => {});
  } else {
    pendingTracks.push(audio);
  }

  return audio;
};

// One-liner to start your ambient stack after unlock
export const startAmbientAfterUnlock = () => {
  // Example ambient tracks - replace with actual URLs if needed, or keep as placeholders
  // safePlay('https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=tension-17998.mp3', 0.1, true);
};

export const isAudioUnlocked = () => userHasInteracted;
export const triggerUnlock = unlockAudio;