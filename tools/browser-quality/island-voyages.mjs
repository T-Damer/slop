import assert from 'node:assert/strict';
import { evaluate, delay } from './cdp-client.mjs';
import { voyageHarness, voyageQa as qa } from './voyage-harness.mjs';

export async function inspectIslandVoyages(cdp, output) {
  const h = voyageHarness(cdp, output);
  await h.viewport(false);
  await cdp.send('Page.reload'); await h.wait(`!!window.__SLOP_ISLAND_QA__?.ready()`);
  const initial = await h.read(); const originalHome = initial.home.state; const oldJournal = initial.journal;
  let layout = initial.voyage.layout;
  const npc = (id) => layout.residents.find((entry) => entry.id === id).point;
  const talk = async (id) => {
    await h.walkTo(npc(id)); await h.key('KeyE'); await h.wait(`${qa}.voyage.blocked`);
  };
  await talk('lumi'); await h.capture('voyage-lumi-dialogue');
  const stationary = (await h.read()).player;
  await h.key('KeyD'); await delay(300); assert.deepEqual((await h.read()).player, stationary);
  await h.click('[data-voyage-command="accept"][data-quest-id="familiar-paths"]');
  await h.key('Escape'); await h.wait(`!${qa}.voyage.blocked`);
  for (const site of layout.sites.slice(0, 3)) {
    await h.walkTo(site.point); await h.wait(`${qa}.voyage.state.discovered.includes('home:${site.id}')`);
    await h.capture(`voyage-${site.id}`);
  }
  await talk('lumi');
  await h.click('[data-voyage-command="claim"][data-quest-id="familiar-paths"]');
  assert.deepEqual((await h.read()).voyage.state.claimed, ['familiar-paths']);
  await h.click('[data-voyage-close]');
  await talk('mira'); await h.click('[data-voyage-command="accept"][data-quest-id="garden-shells"]'); await h.click('[data-voyage-close]');
  await talk('timo'); await h.click('[data-voyage-command="accept"][data-quest-id="pine-letter"]'); await h.click('[data-voyage-close]');
  await h.walkTo(layout.dock); await h.key('KeyE'); await h.wait(`${qa}.voyage.blocked`); await h.capture('voyage-destinations');
  await h.click('[data-voyage-travel="pine"]'); await h.wait(`${qa}.voyage.state.region === 'pine'`);
  layout = (await h.read()).voyage.layout;
  await h.capture('voyage-pine-arrival');
  const letter = layout.pickups.find((pickup) => pickup.item === 'letter');
  await h.walkTo(letter.point); await h.key('KeyE'); await h.wait(`${qa}.voyage.state.inventory.letter === 1`);
  const pineState = (await h.read()).voyage.state;
  await cdp.send('Page.reload'); await h.wait(`!!window.__SLOP_ISLAND_QA__?.ready()`);
  assert.deepEqual((await h.read()).voyage.state, pineState);
  assert.equal((await h.read()).targets.some((target) => target.id === `voyage:pickup:${letter.id}`), false);
  await h.walkTo(layout.dock); await h.key('KeyE'); await h.wait(`${qa}.voyage.blocked`);
  await h.click('[data-voyage-travel="shell"]'); await h.wait(`${qa}.voyage.state.region === 'shell'`);
  layout = (await h.read()).voyage.layout;
  for (const pickup of layout.pickups.filter((entry) => entry.item === 'shell').slice(0, 3)) {
    await h.walkTo(pickup.point); await h.key('KeyE'); await h.wait(`${qa}.voyage.state.collected.includes('${pickup.id}')`);
  }
  assert.equal((await h.read()).voyage.state.inventory.shell, 3);
  await h.capture('voyage-shell-beach');
  await inspectVoyageNotebook(h);
  await h.walkTo(layout.dock); await h.key('KeyE'); await h.wait(`${qa}.voyage.blocked`);
  await h.click('[data-voyage-travel="home"]'); await h.wait(`${qa}.voyage.state.region === 'home'`);
  const returned = await h.read(); layout = returned.voyage.layout;
  assert.ok(Math.hypot(returned.player.x - layout.dock.x, returned.player.z - layout.dock.z) < 2.1);
  assert.deepEqual(returned.home.state, originalHome); assert.deepEqual(returned.journal, oldJournal);
  await talk('mira'); await h.click('[data-voyage-command="claim"][data-quest-id="garden-shells"]'); await h.click('[data-voyage-close]');
  await talk('timo'); await h.click('[data-voyage-command="claim"][data-quest-id="pine-letter"]'); await h.click('[data-voyage-close]');
  const final = (await h.read()).voyage.state;
  assert.equal(final.claimed.length, 3); assert.equal(final.inventory.letter, 0); assert.equal(final.inventory.shell, 0);
  await cdp.send('Page.reload'); await h.wait(`!!window.__SLOP_ISLAND_QA__?.ready()`);
  assert.deepEqual((await h.read()).voyage.state, final);
  await h.capture('voyage-home-rewards');
  return { regions: final.visited, requestsCompleted: final.claimed, realWalking: true, mouseAndTouch: true,
    nativeDialogPause: true, discoveries: true, boatRoundTrip: true, collectionReceipts: true,
    deliveryConservation: true, reloadAway: true, reloadHome: true, legacyHomeAndJournalPreserved: true };
}
async function inspectVoyageNotebook(h) {
  await h.viewport(true); await h.click('[data-voyage-journal]'); await h.wait(`${qa}.voyage.blocked`);
  await h.capture('voyage-journal-phone'); await h.click('[data-voyage-tab="map"]'); await h.capture('voyage-map-phone');
  const bounds = await evaluate(h.cdp, `(() => { const r=document.querySelector('.voyage-dialog').getBoundingClientRect();
    return {width:innerWidth,height:innerHeight,x:r.x,right:r.right,top:r.top,bottom:r.bottom,
      overflow:document.documentElement.scrollWidth>innerWidth};})()`);
  assert.ok(bounds.x >= 0 && bounds.right <= bounds.width && bounds.top >= 0 && bounds.bottom <= bounds.height);
  assert.equal(bounds.overflow, false);
  await h.click('[data-voyage-tab="finds"]'); await h.capture('voyage-finds-phone');
  await h.click('[data-voyage-close]'); await h.wait(`!${qa}.voyage.blocked`); await h.viewport(false);
}
