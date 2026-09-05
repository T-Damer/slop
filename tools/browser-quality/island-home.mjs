import assert from 'node:assert/strict';
import path from 'node:path';
import { evaluate, waitForExpression, captureScreenshot, delay } from './cdp-client.mjs';

const qa = 'window.__SLOP_ISLAND_QA__.scene()';
const timeout = 60000;

export async function inspectIslandHome(cdp, output) {
  const h = homeHarness(cdp, output);
  await h.viewport(false);
  await cdp.send('Page.reload');
  await h.wait(`!!window.__SLOP_ISLAND_QA__?.ready()`);
  const journalBefore = (await h.read()).journal;
  await h.walk('KeyA', `${qa}.player.x <= -1`);
  await h.walk('KeyW', `document.querySelector('[data-island-interact]').textContent === 'Войти домой'`);
  const exteriorPosition = (await h.read()).player;
  await h.enter();
  assert.equal((await h.read()).home.state.items.length, 6);
  await h.capture('home-desktop');
  await inspectRoomLife(h);
  const preview = await inspectHomeEditor(h);
  await inspectHomeAudio(h);
  await h.walk('KeyS', `document.querySelector('[data-island-interact]').textContent === 'Выйти на остров'`);
  await h.exit();
  assert.deepEqual((await h.read()).player, exteriorPosition);
  for (let repeat = 0; repeat < 3; repeat += 1) { await h.enter(); await h.exit(); }
  await cdp.send('Page.reload'); await h.wait(`!!window.__SLOP_ISLAND_QA__?.ready()`);
  assert.deepEqual((await h.read()).home.state, preview);
  assert.deepEqual((await h.read()).journal, journalBefore);
  assert.equal((await h.read()).audio.mix.music, 0);
  return { enterExit: true, furniture: true, lamp: true, rest: true, undoCancel: true,
    blockedExit: true, storageConservation: true, persistence: true, phoneEditor: true,
    audioSignal: true, independentVolumes: true, audioPause: true };
}

function homeHarness(cdp, output) {
  let mobile = false;
  const wait = (condition) => waitForExpression(cdp, condition, timeout);
  const key = async (code) => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: code === 'KeyE' ? 'e' : code });
    await delay(80);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code === 'KeyE' ? 'e' : code });
  };
  return {
    cdp, read: () => evaluate(cdp, qa), wait, key,
    capture: (name) => captureScreenshot(cdp, path.join(output, `${name}.png`)),
    viewport: async (phone) => {
      mobile = phone;
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: phone ? 390 : 1366,
        height: phone ? 844 : 768, deviceScaleFactor: 1, mobile: phone });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: phone, maxTouchPoints: 1 });
    },
    enter: async () => { await key('KeyE'); await wait(`${qa}.home.inside && ${qa}.home.transition === 0`); },
    exit: async () => { await key('KeyE'); await wait(`!${qa}.home.inside && ${qa}.home.transition === 0`); },
    select: (id) => evaluate(cdp, `(() => { const select = document.querySelector('[data-home-selection]');
      select.value = ${JSON.stringify(id)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`),
    walk: async (code, condition) => {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: code.slice(-1).toLowerCase() });
      try { await wait(condition); }
      finally { await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code.slice(-1).toLowerCase() }); }
    },
    click: (selector) => clickHomeControl(cdp, selector, mobile),
  };
}

async function clickHomeControl(cdp, selector, mobile) {
  const point = await evaluate(cdp, `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (mobile) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  }
  await delay(100);
}

async function inspectRoomLife(h) {
  await h.walk('KeyD', `${qa}.player.x >= 0.95`);
  await h.walk('KeyW', `${qa}.player.z <= -1`);
  const lampBefore = (await h.read()).home.state.items.find((item) => item.kind === 'lamp').active;
  await h.key('KeyE');
  await h.wait(`${qa}.home.state.items.find(item => item.kind === 'lamp').active !== ${lampBefore}`);
  await h.walk('KeyS', `${qa}.player.z >= 1`);
  await h.walk('KeyA', `${qa}.player.x <= 0.1`);
  await h.walk('KeyW', `document.querySelector('[data-island-interact]').textContent === 'Сесть'`);
  await h.key('KeyE'); await h.wait(`${qa}.home.resting === true`);
  await h.capture('home-rest');
  await h.key('KeyE'); await h.wait(`${qa}.home.resting === false`);
}

async function inspectHomeEditor(h) {
  const before = (await h.read()).home.state;
  await h.click('[data-island-furnish]'); await h.select('home-plant');
  await h.click('[data-home-edit="east"]');
  assert.notDeepEqual((await h.read()).home.draft, before);
  assert.deepEqual((await h.read()).home.state, before);
  await h.click('[data-home-edit="undo"]'); assert.deepEqual((await h.read()).home.draft, before);
  await h.click('[data-home-edit="east"]'); await h.click('[data-home-edit="cancel"]');
  assert.deepEqual((await h.read()).home.state, before);
  await h.click('[data-island-furnish]'); await h.key('Escape');
  await h.wait(`${qa}.home.editing === false`);
  await h.click('[data-island-furnish]'); await h.select('home-chair');
  await h.click('[data-home-edit="south"]'); await h.click('[data-home-edit="south"]');
  const blocked = (await h.read()).home.draft;
  await h.click('[data-home-edit="south"]');
  assert.deepEqual((await h.read()).home.draft, blocked);
  assert.match(await evaluate(h.cdp, `document.querySelector('.home-editor [role="status"]').textContent`), /двери/);
  await h.click('[data-home-edit="cancel"]');
  await h.click('[data-island-furnish]'); await h.select('home-plant');
  await h.click('[data-home-edit="east"]'); await h.click('[data-home-edit="rotate"]');
  const preview = (await h.read()).home.draft;
  await h.click('[data-home-edit="store"]');
  assert.equal((await h.read()).home.draft.items.filter((item) => item.placed).length, 5);
  await h.click('[data-home-edit="place"]'); assert.equal((await h.read()).home.draft.items.length, 6);
  await h.click('[data-home-edit="undo"]'); await h.click('[data-home-edit="undo"]');
  assert.deepEqual((await h.read()).home.draft, preview);
  await h.capture('home-editor-desktop');
  await h.viewport(true); await delay(600); await h.capture('home-editor-phone');
  const layout = await evaluate(h.cdp, `({ overflow: document.documentElement.scrollWidth > innerWidth,
    editor: document.querySelector('.home-editor').getBoundingClientRect().bottom,
    height: innerHeight, buttons: [...document.querySelectorAll('.home-editor button')].every(b => b.getBoundingClientRect().height >= 44) })`);
  assert.equal(layout.overflow, false); assert.ok(layout.editor <= layout.height); assert.ok(layout.buttons);
  await h.click('[data-home-edit="save"]'); await h.wait(`${qa}.home.editing === false`);
  assert.deepEqual((await h.read()).home.state, preview);
  await h.capture('home-phone');
  return preview;
}

async function inspectHomeAudio(h) {
  await h.wait(`${qa}.audio.status === 'running' && ${qa}.audio.played > 0`);
  await h.wait(`${qa}.audio.level > 0`);
  assert.ok((await h.read()).audio.voices <= 24);
  await h.click('[data-island-sound]');
  await evaluate(h.cdp, `(() => { const input = document.querySelector('[data-sound-bus="music"]');
    input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  assert.equal((await h.read()).audio.mix.music, 0);
  assert.ok((await h.read()).audio.mix.effects > 0);
  await h.click('[data-island-sound]');
  await evaluate(h.cdp, `window.dispatchEvent(new Event('blur'))`);
  await h.wait(`${qa}.audio.status === 'suspended'`);
  assert.equal((await h.read()).audio.voices, 0);
  await evaluate(h.cdp, `window.dispatchEvent(new Event('focus'))`);
}
