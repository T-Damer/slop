import {
  mountTrafficJam,
  unmountTrafficJam,
} from './ui/app.ts';

let registered = false;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') {
    return;
  }
  registered = true;
  mountTrafficJam(document.body);
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') {
    return;
  }
  registered = false;
  unmountTrafficJam();
}
