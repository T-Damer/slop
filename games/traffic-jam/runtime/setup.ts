import {
  mountParkingJam,
  unmountParkingJam,
} from './presentation/app.ts';

let registered = false;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') {
    return;
  }
  registered = true;
  mountParkingJam(document.body);
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') {
    return;
  }
  registered = false;
  unmountParkingJam();
}
