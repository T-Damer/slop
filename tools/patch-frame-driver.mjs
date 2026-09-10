import { createHash } from 'node:crypto';
export const frameDriverPatch = {
  path: 'engine/packages/modoki/src/runtime/rendering/frameDriver.ts',
  blob: '192f8f9c3d74f722dd4aff46d5e52c8b17b172a8',
};
// Resume gets one fresh frame opportunity. A genuinely dead chain is still
// diagnosed after the normal watchdog grace; no console filtering or RAF shim.
const changes = [
  ['if (gen !== loopGen) return; // superseded chain — retire silently',
   'if (gen !== loopGen || !loopArmed || refCount === 0) return; // superseded or stopped chain'],
  ['  rafId = requestAnimationFrame(makeFrame(loopGen));',
   '  cancelAnimationFrame(rafId);\n  rafId = requestAnimationFrame(makeFrame(loopGen));'],
  ['let watchdogId: ReturnType<typeof setInterval> | undefined;',
   'let watchdogId: ReturnType<typeof setInterval> | undefined;\nlet lastWatchdogAt = 0;'],
  ['function checkStall() {', `// SLOP lifecycle patch: refs remain owned by the existing engine consumers.
function resumeFrames() {
  if (!loopArmed || refCount === 0) return;
  if (documentHidden()) { loopGen++; cancelAnimationFrame(rafId); return; }
  lastFrameTime = 0;
  armLoop();
}
function checkStall() {
  const watchdogNow = rawNow();
  const suspended = lastWatchdogAt > 0 && watchdogNow - lastWatchdogAt > WATCHDOG_INTERVAL_MS * 2;
  lastWatchdogAt = watchdogNow;`],
  ['  const since = msSinceProgress();',
   '  if (suspended) { armLoop(); return; } // event loop/sleep suspension, not evidence of a broken RAF\n  const since = msSinceProgress();'],
  ['  watchdogId = setInterval(checkStall, WATCHDOG_INTERVAL_MS);', `  lastWatchdogAt = rawNow();
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', resumeFrames);
  if (typeof window !== 'undefined') window.addEventListener('pageshow', resumeFrames);
  watchdogId = setInterval(checkStall, WATCHDOG_INTERVAL_MS);`],
  ['  clearInterval(watchdogId);', `  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', resumeFrames);
  if (typeof window !== 'undefined') window.removeEventListener('pageshow', resumeFrames);
  lastWatchdogAt = 0;
  clearInterval(watchdogId);`],
];
export function patchFrameDriver(source) {
  let original = source;
  for (const [before, after] of [...changes].reverse()) original = original.replace(after, before);
  const bytes = Buffer.from(original);
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (hash !== frameDriverPatch.blob) throw new Error('Unreviewed Modoki frameDriver: lifecycle patch refused.');
  return changes.reduce((text, [before, after]) => {
    if (text.split(before).length !== 2) throw new Error('Ambiguous frameDriver patch anchor.');
    return text.replace(before, after);
  }, original);
}
