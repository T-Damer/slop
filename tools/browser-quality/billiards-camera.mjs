import { captureScreenshot, delay, evaluate, waitForExpression } from './cdp-client.mjs';
import { clickControl } from './billiards-presets.mjs';

const qa = 'window.__SLOP_BILLIARDS_QA_V2__';
export async function settleCamera(cdp) {
  await waitForExpression(cdp, `${qa}?.snapshot().camera.settled === true`, 4000);
}
async function key(cdp, name) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name });
}
export async function verifyGraphicsMenu(cdp, directory) {
  await clickControl(cdp, '.slop-graphics-launcher');
  await waitForExpression(cdp, "document.querySelector('.slop-graphics dialog')?.open === true", 3000);
  await clickControl(cdp, '.slop-graphics select'); await key(cdp, 'End'); await key(cdp, 'Enter');
  await waitForExpression(cdp, `${qa}.snapshot().renderer.quality === 'low'`, 3000);
  await captureScreenshot(cdp, `${directory}/graphics-settings.png`);
  await clickControl(cdp, '.slop-graphics dialog button');
  await cdp.send('Page.reload');
  await waitForExpression(cdp, `${qa}?.snapshot().renderer.quality === 'low'`, 20000);
  await clickControl(cdp, '.slop-graphics-launcher');
  await clickControl(cdp, '.slop-graphics select'); await key(cdp, 'Home'); await key(cdp, 'ArrowDown'); await key(cdp, 'Enter');
  await waitForExpression(cdp, `${qa}.snapshot().renderer.quality === 'high'`, 3000);
  await clickControl(cdp, '.slop-graphics select'); await key(cdp, 'Home'); await key(cdp, 'Enter');
  await clickControl(cdp, '.slop-graphics dialog button');
  return { persistedLow: true, appliedHigh: true };
}

export async function verifyCamera(cdp, ui, directory) {
  await settleCamera(cdp);
  const before = await evaluate(cdp, `${qa}.snapshot()`);
  await clickControl(cdp, '[data-billiards-zoom]'); await settleCamera(cdp);
  const zoomed = await evaluate(cdp, `${qa}.snapshot()`);
  if (zoomed.camera.zoom < 1.3) throw new Error('Explicit close-up did not enlarge the balls.');
  await captureScreenshot(cdp, `${directory}/close-up.png`);
  if (zoomed.camera.portrait) {
    const rect = await evaluate(cdp, "(() => { const r=document.querySelector('.billiards-stage').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()");
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    const touches = (dx, dy, distance) => [{ x: rect.x + dx - distance, y: rect.y + dy, id: 1 },
      { x: rect.x + dx + distance, y: rect.y + dy, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches(0, 0, 30) });
    await delay(30);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touches(12, -15, 48) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const after = await evaluate(cdp, `${qa}.snapshot()`);
    if (after.controller.match.revision !== before.controller.match.revision || after.controller.match.activeShot !== null) {
      throw new Error('A two-finger camera gesture executed a gameplay command.');
    }
    if (after.camera.zoom <= zoomed.camera.zoom) throw new Error('Pinch did not change camera scale.');
    if (after.camera.multiTouch) throw new Error('The pinch gesture remained captured after release.');
  }
  await clickControl(cdp, '[data-billiards-zoom]'); await settleCamera(cdp);
  const restored = await evaluate(cdp, `${qa}.snapshot().camera`);
  if (Math.abs(restored.zoom - 1) > 0.001) throw new Error('Overview failed to restore the whole table.');
  return { enlargedBy: zoomed.camera.zoom, overview: restored.zoom, pinchTested: zoomed.camera.portrait };
}

export async function verifyPocketJourney(cdp, ui, directory, aimPoint, clickAt) {
  // This is a real second shot after the unchanged 0.68-power break, not injected pots.
  const angle = -1.4336742886722746, power = 0.35;
  const position = await evaluate(cdp, `(() => {const cue=${qa}.snapshot().controller.match.table.balls.find(b=>b.id===0);
    return {x:640+cue.position.x*1020/254, y:360+cue.position.y*1020/254};})()`);
  const powerPoint = await evaluate(cdp, `(() => {const r=document.querySelector('.billiards-power-control').getBoundingClientRect();
    return {x:r.left+r.width*${power},y:r.bottom-22};})()`);
  await clickAt(cdp, powerPoint);
  await clickAt(cdp, await aimPoint(cdp, ui, position.x + Math.cos(angle) * 200, position.y + Math.sin(angle) * 200));
  await settleCamera(cdp);
  await evaluate(cdp, `(() => {
    const evidence=window.__billiardsPotEvidence={drops:0,returns:0,stop:false};
    const sample=()=>{if(evidence.stop)return; const p=${qa}.snapshot().pockets;
      evidence.drops=Math.max(evidence.drops,p.activeDrops); evidence.returns=Math.max(evidence.returns,p.activeReturns); requestAnimationFrame(sample);}; sample();
  })()`);
  await clickControl(cdp, ui.shootSelector);
  await waitForExpression(cdp, `${qa}.snapshot().pockets.activeDrops > 0`, 20000);
  await captureScreenshot(cdp, `${directory}/pocket-sink.png`);
  await waitForExpression(cdp, `${qa}.snapshot().pockets.deliveredCount > 0`, 5000);
  await captureScreenshot(cdp, `${directory}/pot-arrival.png`);
  await waitForExpression(cdp, `${qa}.snapshot().controller.match.activeShot === null`, 20000);
  await delay(600);
  const evidence = await evaluate(cdp, '(() => { window.__billiardsPotEvidence.stop=true; return window.__billiardsPotEvidence; })()');
  if (evidence.drops === 0 || evidence.returns === 0) throw new Error('Pocket sink / HUD roll-out was not rendered.');
  return evidence;
}
