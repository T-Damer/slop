import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureScreenshot, evaluate, waitForExpression } from './cdp-client.mjs';

export async function waitForBilliardsStartup(cdp, ui, directory, runtimeErrors) {
  try {
    await waitForExpression(cdp, `Boolean(${ui.qaExpression})`, 20000);
  } catch (error) {
    const startup = { runtimeErrors: [...runtimeErrors], detail: String(error),
      dom: await evaluate(cdp, 'document.body.innerText'),
      build: await evaluate(cdp, 'document.querySelector(\'meta[name="slop-build-sha"]\')?.content') };
    startup.bundleContext = await failureBundleContext(runtimeErrors);
    console.error(JSON.stringify(startup, null, 2));
    await writeFile(path.join(directory, 'startup-error.json'), JSON.stringify(startup, null, 2));
    await captureScreenshot(cdp, path.join(directory, 'startup-error.png'));
    throw error;
  }
}

/** Read the exact local production asset named by the browser stack. A source
 * artifact from another run must never be used to diagnose a minified offset. */
async function failureBundleContext(errors) {
  const stack = errors.join('\n');
  const match = stack.match(/\/assets\/([A-Za-z0-9_-]+\.js):(\d+):(\d+)/);
  if (!match) return null;
  const [, file, lineNumber, columnNumber] = match;
  try {
    const source = await readFile(path.join('games/traffic-jam/dist/assets', file), 'utf8');
    const lines = source.split('\n'), line = Number(lineNumber) - 1, column = Number(columnNumber) - 1;
    return { file, line: line + 1, column: column + 1,
      before: lines.slice(Math.max(0, line - 2), line).join('\n').slice(-6000),
      at: lines[line]?.slice(Math.max(0, column - 3000), column + 14000) };
  } catch (error) { return { file, readError: String(error) }; }
}
