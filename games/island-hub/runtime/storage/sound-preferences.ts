import { normalizeSoundMix, type SoundMix } from '../domain/sound-settings.ts';
const soundPreferenceKey = 'slop.island-sound.v1';
export function loadSoundMix(): SoundMix {
  try { return normalizeSoundMix(JSON.parse(localStorage.getItem(soundPreferenceKey) ?? 'null')); }
  catch { return normalizeSoundMix(null); }
}
export function saveSoundMix(mix: SoundMix): boolean {
  try { localStorage.setItem(soundPreferenceKey, JSON.stringify(normalizeSoundMix(mix))); return true; }
  catch { return false; }
}
