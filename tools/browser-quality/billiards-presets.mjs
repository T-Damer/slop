import { captureScreenshot, delay, evaluate, waitForExpression } from './cdp-client.mjs';

export async function clickControl(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Missing control: ' + ${JSON.stringify(selector)});
    const rect = element.getBoundingClientRect();
    return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}

export async function chooseNewMatch(cdp, ui, preset = 'american') {
  await clickControl(cdp, ui.restartSelector);
  await waitForExpression(cdp, "document.querySelector('.billiards-match-dialog')?.open === true", 3000);
  await clickControl(cdp, `.billiards-match-dialog input[value="${preset}"]`);
  await clickControl(cdp, '[data-billiards-new-match]');
  await waitForExpression(cdp, `document.querySelector(${JSON.stringify(ui.rootSelector)})?.dataset.preset === '${preset}'
    && document.querySelector('.billiards-match-dialog')?.open === false`, 3000);
}

export async function verifyNewMatchPause(cdp, ui) {
  const read = () => evaluate(cdp, ui.qaExpression);
  await clickControl(cdp, ui.restartSelector);
  await waitForExpression(cdp, "document.querySelector('.billiards-match-dialog')?.open === true", 3000);
  const before = await read();
  await delay(220);
  const during = await read();
  if (JSON.stringify(before.match) !== JSON.stringify(during.match)) throw new Error('The new-match dialog did not pause the table.');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await waitForExpression(cdp, "document.querySelector('.billiards-match-dialog')?.open === false", 3000);
  if ((await read()).match.revision !== before.match.revision) throw new Error('Cancelling the dialog changed the match.');
}

export async function verifyPresetRoundtrip(cdp, ui, directory, playBreak) {
  const failures = [];
  const before = await evaluate(cdp, ui.qaExpression);
  await clickControl(cdp, ui.restartSelector);
  await waitForExpression(cdp, "document.querySelector('.billiards-match-dialog')?.open === true", 3000);
  const note = await evaluate(cdp, "document.querySelector('.billiards-match-dialog').textContent");
  if (!note.includes('не правила пирамиды') || !note.includes('8-ball')) failures.push('Preset rule limitations are not explained.');
  await captureScreenshot(cdp, `${directory}/new-match.png`);
  await clickControl(cdp, '.billiards-match-dialog button[value="cancel"]');
  if ((await evaluate(cdp, ui.qaExpression)).match.revision !== before.match.revision) failures.push('Cancel reset the match.');
  await chooseNewMatch(cdp, ui, 'russian');
  const russian = await evaluate(cdp, ui.qaExpression);
  if (russian.match.table.presetId !== 'russian' || russian.match.table.balls.some((ball) => ball.pocketed)) failures.push('Russian preset did not start a fresh rack.');
  await captureScreenshot(cdp, `${directory}/russian-rack.png`);
  const result = await playBreak();
  if (!result.completed || !result.cueMoved || !result.revisionAdvanced) failures.push('Russian break failed.');
  const shot = await evaluate(cdp, ui.qaExpression);
  const pots = shot.match.table.balls.filter((ball) => ball.pocketed && ball.pocketedBy !== undefined);
  const rendered = await evaluate(cdp, "[...document.querySelectorAll('[data-billiards-pocket-slot]:not([hidden])')].map(e => ({id:Number(e.textContent), player:Number(e.closest('[data-player-index]').dataset.playerIndex)}))");
  if (pots.length !== rendered.length || pots.some((ball) => !rendered.some((e) => e.id === ball.id && e.player === ball.pocketedBy))) failures.push('HUD pocket attribution differs from the match.');
  await chooseNewMatch(cdp, ui, 'american');
  await delay(600);
  const frame = () => evaluate(cdp, 'window.__SLOP_BILLIARDS_QA_V2__.snapshot().renderer');
  const first = await frame();
  await delay(400);
  const second = await frame();
  if (first.sceneDrawCount !== second.sceneDrawCount) failures.push('Idle table is still being redrawn.');
  if (first.ballRendering.spriteBuildCount !== second.ballRendering.spriteBuildCount) failures.push('Idle ball materials are being rebuilt.');
  return { failures, russianBreak: result, pocketsAttributed: pots.length,
    idleSceneDraws: second.sceneDrawCount - first.sceneDrawCount, cachedBallSprites: second.ballRendering.cachedSprites };
}
