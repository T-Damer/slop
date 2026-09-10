import {
  mountGameHub,
  unmountGameHub,
} from '../../hub/runtime/presentation/app.ts';

let registered = false;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') {
    return;
  }
  registered = true;
  mountGameHub(document.body);
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') {
    return;
  }
  registered = false;
  unmountGameHub();
}
