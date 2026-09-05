import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureScreenshot, evaluate, waitForExpression } from './cdp-client.mjs';

export async function waitForBilliardsStartup(cdp, ui, directory, runtimeErrors) {
  try {
    await waitForExpression(cdp, `Boolean(${ui.qaExpression})`, 20000);
  } catch (error) {
    const startup = { runtimeErrors: [...runtimeErrors], detail: String(error),
      dom: await evaluate(cdp, 'document.body.innerText'),
      build: await evaluate(cdp, 'document.querySelector(\'meta[name="slop-build-sha"]\')?.content') };
    console.error(JSON.stringify(startup, null, 2));
    await writeFile(path.join(directory, 'startup-error.json'), JSON.stringify(startup, null, 2));
    await captureScreenshot(cdp, path.join(directory, 'startup-error.png'));
    throw error;
  }
}
