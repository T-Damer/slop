import assert from 'node:assert/strict';
import test from 'node:test';
import { CdpClient, waitForExpression } from './browser-quality/cdp-client.mjs';

test('protocol rejection retains the failing method and parameters', async () => {
  const client = new CdpClient('ws://localhost/test');
  client.socket = { send() {} };
  const pending = client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 2, y: 3 });
  client.handleMessage(JSON.stringify({ id: 1, error: { code: -32602, message: 'Invalid parameters' } }));
  await assert.rejects(pending, /Input.dispatchMouseEvent: Invalid parameters.*mouseWheel/);
  assert.equal(client.pending.size, 0);
});


test('protocol details do not replace the exact attempted input parameters', async () => {
  const client = new CdpClient('ws://localhost/test');
  client.socket = { send() {} };
  const result = client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 12.5, y: 70 }] });
  client.handleMessage(JSON.stringify({ id: 1, error: { code: -32602, message: 'Invalid parameters', data: 'double value expected' } }));
  await assert.rejects(result, /double value expected.*touchStart.*12.5/);
});


test('movement waits can poll faster without changing their predicate or deadline', async () => {
  const original = globalThis.setTimeout;
  const intervals = [];
  let reads = 0;
  globalThis.setTimeout = (callback, milliseconds) => { intervals.push(milliseconds); return original(callback, 0); };
  try {
    await waitForExpression({ send: async () => ({ result: { value: ++reads >= 3 } }) }, 'player.x >= 2.5', 1000, 10);
    assert.deepEqual(intervals, [10, 10]);
    reads = 0; intervals.length = 0;
    await waitForExpression({ send: async () => ({ result: { value: ++reads >= 2 } }) }, 'dialog.open', 1000);
    assert.deepEqual(intervals, [100]);
  } finally { globalThis.setTimeout = original; }
});
