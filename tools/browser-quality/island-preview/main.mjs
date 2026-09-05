// Development-only mount of the real island. No copied simulation or game router.
import { mountPersonalIsland, unmountPersonalIsland } from '../../../games/island-hub/runtime/presentation/app.ts';

await mountPersonalIsland(document.body, {
  games: [
    { id: 'billiards', name: 'Pocket Club', description: 'Бильярд', emoji: '🎱' },
    { id: 'parking-jam', name: 'Parking Jam', description: 'Парковка', emoji: '🚗' },
    { id: 'junkyard-station', name: 'Junkyard Station', description: 'Автозаправка', emoji: '⛽' },
  ],
  onLaunchGame: (id) => { document.body.dataset.launchedGame = id; },
});
window.addEventListener('pagehide', unmountPersonalIsland, { once: true });
