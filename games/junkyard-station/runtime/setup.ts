import { mountGameNavigation } from '../../shared/game-shell/navigation.ts';
import {
  mountJunkyardStation,
  unmountJunkyardStation,
} from './presentation/app.ts';

let registered = false;
let unmountNavigation: (() => void) | null = null;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') {
    return;
  }
  registered = true;
  mountJunkyardStation(document.body);
  unmountNavigation = mountGameNavigation(document.body, 'Junkyard Station');
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') {
    return;
  }
  registered = false;
  unmountNavigation?.();
  unmountNavigation = null;
  unmountJunkyardStation();
}
