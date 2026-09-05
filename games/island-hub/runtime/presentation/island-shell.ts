import type { IslandSnapshot } from '../domain/types.ts';
import type { PersonalIslandGameEntry } from './app.ts';

export function renderIslandShell(
  snapshot: IslandSnapshot,
  games: ReadonlyArray<PersonalIslandGameEntry>,
): string {
  return `
    <main class="personal-island" id="slop-personal-island">
      <div class="island-canvas-host"></div>
      <header class="island-hud">
        <div class="island-name-card">
          <span>🏝️</span><div><strong>Остров ${snapshot.profile.displayName}</strong><small data-island-journal>Яблоки 0 · Сад 0/3</small></div>
        </div>
        <div class="island-hud-actions">
          <button type="button" data-island-shell-action="camera" aria-label="Сменить камеру">📷 <span data-island-camera-label>Ближе</span></button>
          <button type="button" data-island-shell-action="games" aria-label="Открыть игры">🎮 Игры</button>
        </div>
      </header>
      <div class="island-guide-tip"><span>✨</span><p><strong>Луми</strong> Подойди к светящемуся порталу или открой меню игр.</p></div>
      <div class="island-portal-progress" aria-live="polite"><span></span><strong></strong></div>
      <div class="island-joystick-base" aria-label="Джойстик движения"><span class="island-joystick-knob"></span></div>
      <div class="island-play-actions"><button type="button" data-island-run aria-pressed="false">Бег · Shift</button><button type="button" data-island-interact disabled>Подойди к дереву или жителю</button></div>
      <div class="island-toast" data-island-toast role="status" aria-live="polite" hidden></div>
      <div class="island-control-hint">WASD / стрелки — идти · Shift — бежать · E — действие</div>
      ${renderGameMenu(games)}
    </main>
  `;
}

function renderGameMenu(games: ReadonlyArray<PersonalIslandGameEntry>): string {
  return `
    <aside class="island-game-menu" role="dialog" aria-label="Игры SLOP" aria-modal="true" aria-hidden="true" inert>
      <div class="island-menu-header"><div><small>Куда отправимся?</small><h2>Игры SLOP</h2></div><button type="button" data-island-shell-action="close-games" aria-label="Закрыть">×</button></div>
      <div class="island-menu-grid">
        ${games.map((game) => `
          <button class="island-game-card" type="button" data-island-game-id="${game.id}">
            <span>${game.emoji}</span><div><strong>${game.name}</strong><small>${game.description}</small></div>
          </button>
        `).join('')}
      </div>
      <button class="island-regenerate" type="button" data-island-shell-action="regenerate">✨ Создать остров заново</button>
    </aside>
  `;
}

