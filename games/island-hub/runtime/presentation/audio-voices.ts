import { islandScore as score } from './audio-score.ts';

export interface SoundVoice { readonly stop: () => void }
/** Each finite voice owns its complete graph and disconnects when it ends. */
export function playIslandVoice(context: AudioContext, destination: AudioNode,
  frequency: number, duration: number, volume: number, at: number,
  noise: AudioBuffer | null, ended: (voice: SoundVoice) => void): SoundVoice {
  const source = noise === null ? context.createOscillator() : context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  filter.type = noise === null ? 'lowpass' : 'bandpass';
  filter.frequency.value = noise === null ? frequency * 3 : frequency;
  filter.Q.value = noise === null ? 0.5 : 0.7;
  if (source instanceof OscillatorNode) { source.type = 'triangle'; source.frequency.value = frequency; }
  else source.buffer = noise;
  envelope.gain.setValueAtTime(score.silence, at);
  envelope.gain.linearRampToValueAtTime(volume, at + Math.min(0.015, duration / 4));
  envelope.gain.exponentialRampToValueAtTime(score.silence, at + duration);
  source.connect(filter).connect(envelope).connect(destination);
  let stopped = false;
  const voice: SoundVoice = { stop: () => {
    if (stopped) return;
    stopped = true;
    source.onended = null;
    source.stop(); source.disconnect(); filter.disconnect(); envelope.disconnect();
    ended(voice);
  } };
  source.onended = voice.stop;
  source.start(at);
  source.stop(at + duration + 0.025);
  return voice;
}
export function createIslandNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * score.noiseSeconds), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let state = 1871;
  let previous = 0;
  for (let i = 0; i < samples.length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    previous = previous * 0.65 + (state / 0xffffffff * 2 - 1) * 0.35;
    samples[i] = previous;
  }
  return buffer;
}
