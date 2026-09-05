import { settleCamera } from './billiards-camera.mjs';
import { chooseNewMatch, verifyNewMatchPause } from './billiards-presets.mjs';
import { delay, evaluate, waitForExpression } from './cdp-client.mjs';

export async function clickAt(cdp, point) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}

export function aimPoint(cdp, ui, x, y) {
  return evaluate(cdp, `(() => {
    const rect = document.querySelector(${JSON.stringify(ui.canvasSelector)}).getBoundingClientRect();
    return innerHeight > innerWidth
      ? { x: rect.left + (1 - ${y} / 720) * rect.width, y: rect.top + ${x} / 1280 * rect.height }
      : { x: rect.left + ${x} / 1280 * rect.width, y: rect.top + ${y} / 720 * rect.height };
  })()`);
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
  await clickAt(cdp, point);
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
  const start = await aimPoint(cdp, ui, 600, 360);
  const back = await aimPoint(cdp, ui, 500, 360);
  const contact = await aimPoint(cdp, ui, 610, 360);
  if (touch) {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  } else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...start });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 });
  }
  await delay(30);
  const move = (point) => touch
    ? cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] })
    : cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, button: 'left', buttons: 1 });
  await move(back);
  await delay(40);
  const pulled = await evaluate(cdp, ui.qaExpression);
  if (pulled?.interaction.mode !== 'manual-stroke' || pulled.interaction.stroke.pullback < 90) {
    throw new Error('The captured pointer did not pull the prepared cue.');
  }
  await move(contact);
  if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...contact, button: 'left', clickCount: 1 });
  return { pointer: touch ? 'touch' : 'mouse', pullback: pulled.interaction.stroke.pullback };
}
