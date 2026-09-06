import { settleCamera } from './billiards-camera.mjs';
import { chooseNewMatch, verifyNewMatchPause } from './billiards-presets.mjs';
import { delay, evaluate, waitForExpression } from './cdp-client.mjs';

export async function clickAt(cdp, point) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}

export async function aimPoint(cdp, ui, x, y) {
  const point = await evaluate(cdp, `(() => {
    const rect = document.querySelector(${JSON.stringify(ui.canvasSelector)}).getBoundingClientRect();
    return innerHeight > innerWidth
      ? { x: rect.left + (1 - ${y} / 720) * rect.width, y: rect.top + ${x} / 1280 * rect.height }
      : { x: rect.left + ${x} / 1280 * rect.width, y: rect.top + ${y} / 720 * rect.height };
  })()`);
  return inputPoint(point);
}

/** Native input coordinates are viewport CSS pixels. Preserve subpixel accuracy
 * but never send NaN/null to CDP, whose JSON transport would hide their origin. */
export function inputPoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    throw new Error(`Invalid billiards input coordinate: ${JSON.stringify(point)}`);
  }
  return { x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 };
}

export async function verifyAimControls(cdp, ui) {
  const failures = [];
  const read = () => evaluate(cdp, ui.qaExpression);
  const point = await aimPoint(cdp, ui, 950, 360);
  await clickAt(cdp, point);
  const locked = await read();
  if (locked.interaction.mode !== 'aim-locked') failures.push('Click did not lock aim.');
  if (!await evaluate(cdp, `document.activeElement?.matches(${JSON.stringify(ui.shootSelector)})`)) {
    failures.push('Aim lock did not focus the shot action.');
  }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  if ((await read()).angleRadians === locked.angleRadians) failures.push('Arrow key did not adjust aim.');
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaX: 0, deltaY: -50 });
  await delay(80);
  if ((await read()).power <= locked.power) failures.push('Wheel did not increase power.');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  if ((await read()).interaction.mode !== 'aiming') failures.push('Escape did not unlock aim.');
  // Auto-zoom returns to overview after unlock. Recompute the aim coordinate only
  // after the camera settles, otherwise a stale screen point changes the shot angle.
  await settleCamera(cdp);
  const relockPoint = await aimPoint(cdp, ui, 950, 360);
  await clickAt(cdp, relockPoint);
  const gesture = await performManualStroke(cdp, ui);
  await waitForExpression(cdp, `document.querySelector(${JSON.stringify(ui.rootSelector)})?.dataset.shotActive === 'true'`, 3000);
  const executed = await read();
  if (executed.match.revision !== locked.match.revision + 1) failures.push('Manual gesture did not execute exactly one shot.');
  await verifyNewMatchPause(cdp, ui);
  await chooseNewMatch(cdp, ui);
  return { locked: locked.interaction.mode, gesture, failures };
}

export async function performManualStroke(cdp, ui) {
  await settleCamera(cdp);
  const touch = await evaluate(cdp, 'innerHeight > innerWidth');
  const stageBefore = await evaluate(cdp, "document.querySelector('.billiards-stage').getBoundingClientRect().height");
  const start = await aimPoint(cdp, ui, 600, 360);
  const back = await aimPoint(cdp, ui, 500, 360);
  const contact = await aimPoint(cdp, ui, 610, 360);
  if (!await evaluate(cdp, `${JSON.stringify([start, back, contact])}.every(p =>
    document.elementFromPoint(p.x,p.y)?.matches(${JSON.stringify(ui.canvasSelector)}))`)) {
    throw new Error(`Manual stroke leaves the visible canvas: ${JSON.stringify({ start, back, contact })}`);
  }
  let released = false;
  try {
    if (touch) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    } else {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...start });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 });
    }
    await waitForExpression(cdp, `${ui.qaExpression}?.interaction.mode === 'manual-stroke'`, 3000);
    const move = (point) => touch
      ? cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] })
      : cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, button: 'left', buttons: 1 });
    await move(back);
    await waitForExpression(cdp, `${ui.qaExpression}?.interaction.stroke?.pullback >= 90`, 3000);
    const pulled = await evaluate(cdp, ui.qaExpression);
    const stageAfter = await evaluate(cdp, "document.querySelector('.billiards-stage').getBoundingClientRect().height");
    if (Math.abs(stageAfter - stageBefore) > 1) throw new Error('Interaction hint resized the camera during the stroke.');
    await move(contact);
    if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...contact, button: 'left', clickCount: 1 });
    released = true;
    return { pointer: touch ? 'touch' : 'mouse', pullback: pulled.interaction.stroke.pullback };
  } catch (error) {
    const state = await evaluate(cdp, ui.qaExpression).catch(() => null);
    error.message += `; gesture=${JSON.stringify({ start, back, contact, interaction: state?.interaction, angle: state?.angleRadians })}`;
    throw error;
  } finally {
    if (touch && !released) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => undefined);
  }
}
