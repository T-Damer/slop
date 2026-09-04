import { delay, evaluate } from './cdp-client.mjs';

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
  return { locked: locked.interaction.mode, failures };
}
