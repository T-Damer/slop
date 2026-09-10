import { evaluate, waitForExpression, captureScreenshot } from './cdp-client.mjs';
import { setPowerWithWheel, settleCamera } from './billiards-camera.mjs';
import { clickAt, aimPoint } from './billiards-controls.mjs';
import { clickControl, chooseNewMatch } from './billiards-presets.mjs';

const qa = 'window.__SLOP_BILLIARDS_QA_V2__';

/** Only observes real gameplay and DOM geometry. Camera zoom itself is allowed;
 * moving the stage/HUD/actions because their copy or score changes is not. */
export async function watchHud(cdp) {
  await evaluate(cdp, `(() => {
    const selectors=['.billiards-stage','.billiards-scoreboard','.billiards-controls',
      '[data-billiards-shoot]','[data-billiards-restart]', '[data-billiards-power-rail]',
      '[data-billiards-angle-rail]', '[data-player-index="0"]', '[data-player-index="1"]'];
    const bounds=()=>selectors.map(selector=>{
      const r=document.querySelector(selector).getBoundingClientRect(); return [r.x,r.y,r.width,r.height];
    });
    const initial=bounds();
    const evidence=window.__billiardsHudEvidence={samples:0,maxShiftPx:0,turns:[],maxPots:0,stop:false,failures:[]};
    const sample=()=>{
      if(evidence.stop)return;
      evidence.samples++;
      bounds().forEach((r,i)=>r.forEach((v,j)=>{evidence.maxShiftPx=Math.max(evidence.maxShiftPx,Math.abs(v-initial[i][j]));}));
      const match=${qa}.snapshot().controller.match;
      if(!evidence.turns.includes(match.turnIndex))evidence.turns.push(match.turnIndex);
      evidence.maxPots=Math.max(evidence.maxPots,match.table.balls.filter(b=>b.pocketed&&b.pocketedBy!==undefined).length);
      if(match.ballInHand&&!document.querySelector('.billiards-table-hint').textContent.includes(match.status)
        &&!evidence.failures.length)evidence.failures.push('Placement hides its authoritative foul reason.');
      requestAnimationFrame(sample);
    };sample();
  })()`);
}
export async function finishHudWatch(cdp) {
  const evidence = await evaluate(cdp, '(() => {window.__billiardsHudEvidence.stop=true;return window.__billiardsHudEvidence;})()');
  if (evidence.maxShiftPx > 1) evidence.failures.push(`HUD shifted by ${evidence.maxShiftPx}px during gameplay.`);
  if (evidence.maxPots === 0 || evidence.turns.length < 2) evidence.failures.push('HUD watch did not observe both a pot and a turn change.');
  return evidence;
}

export async function verifyPowerGuide(cdp, ui, directory) {
  await settleCamera(cdp);
  const lengths = [];
  for (const power of [0.04, 0.12, 0.68]) {
    await setPowerWithWheel(cdp, power);
    const preview = await evaluate(cdp, `${qa}.snapshot().controller.preview`);
    lengths.push(Math.hypot(preview.cuePath[1].x - preview.cuePath[0].x, preview.cuePath[1].y - preview.cuePath[0].y));
    if (power < 0.68 && (preview.firstCollision !== null || preview.objectPath.length)) throw new Error('Weak guide predicts an unreachable collision.');
    await captureScreenshot(cdp, `${directory}/guide-${power}.png`);
  }
  if (!(lengths[0] < lengths[1] && lengths[1] < lengths[2])) throw new Error(`Power does not lengthen the guide: ${lengths}`);
  return { powers: [0.04, 0.12, 0.68], lengths };
}

export async function verifyNonScratchFoul(cdp, ui, directory) {
  // A weak real shot cannot reach the rack. The cue stays on the table, but the
  // no-contact foul must explain why the incoming player gets placement.
  await setPowerWithWheel(cdp, 0.04);
  const read = () => evaluate(cdp, ui.qaExpression);
  const before = await read();
  await clickControl(cdp, ui.shootSelector);
  await waitForExpression(cdp, `${qa}.snapshot().controller.match.ballInHand === true`, 10000);
  const foul = await read();
  if (foul.match.table.balls.find(b => b.id === 0).pocketed || !foul.match.status.includes('не коснулся')
    || !foul.match.status.includes('Биток с руки')) throw new Error('Non-scratch foul is not explained.');
  await captureScreenshot(cdp, `${directory}/non-scratch-foul.png`);
  await clickAt(cdp, await aimPoint(cdp, ui, 300, 320));
  const placed = await read();
  if (placed.match.ballInHand || placed.match.revision !== foul.match.revision + 1) throw new Error('Placement was not consumed once.');
  const position = JSON.stringify(placed.match.table.balls.find(b => b.id === 0).position);
  await clickAt(cdp, await aimPoint(cdp, ui, 900, 350));
  if (JSON.stringify((await read()).match.table.balls.find(b => b.id === 0).position) !== position) throw new Error('Ordinary aiming moved the cue ball.');
  await chooseNewMatch(cdp, ui);
  // Restart restores the overview asynchronously. Its rectangle must stop
  // moving before the next fixture converts a world aim into screen input.
  await settleCamera(cdp);
  return { cueStayedOnTable: true, reason: foul.match.status, placementRevision: placed.match.revision, baselineRevision: before.match.revision };
}
