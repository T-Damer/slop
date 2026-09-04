import {
  createAndSaveIslandSnapshot,
  loadIslandSnapshot,
} from '../application/session.ts';
import type {
  IslandDestinationId,
  IslandPortalProgress,
  IslandSnapshot,
} from '../domain/types.ts';
import {
  createLocalIslandRepository,
  getOrCreateLocalPlayerId,
} from '../storage/local-island-repository.ts';
import { mountIslandOnboarding, type IslandOnboardingController } from './onboarding.ts';
import { PersonalIslandScene, type IslandSceneSnapshot } from './scene.ts';
import { installIslandStyles } from './play-styles.ts';
import { IslandMenuFocus } from './menu-focus.ts';
import { loadIslandJournal, saveIslandJournal, clearIslandJournal } from '../storage/journal-repository.ts';

export interface PersonalIslandGameEntry {
  readonly id: IslandDestinationId;
  readonly name: string;
  readonly description: string;
  readonly emoji: string;
}

export interface PersonalIslandOptions {
  readonly games: ReadonlyArray<PersonalIslandGameEntry>;
  readonly onLaunchGame: (gameId: IslandDestinationId) => void;
}

interface IslandQaBridge {
  readonly schemaVersion: 1;
  readonly ready: () => boolean;
  readonly hasSnapshot: () => boolean;
  readonly scene: () => IslandSceneSnapshot | null;
  readonly availableGames: () => ReadonlyArray<string>;
}

declare global {
  interface Window {
    __SLOP_ISLAND_QA__?: IslandQaBridge;
  }
}

const ui = {
  rootId: 'slop-personal-island-root',
  styleId: 'slop-personal-island-style',
  actions: {
    camera: 'camera',
    games: 'games',
    closeGames: 'close-games',
    regenerate: 'regenerate',
  },
} as const;

let activeApp: PersonalIslandApp | null = null;

export async function mountPersonalIsland(
  parent: HTMLElement,
  options: PersonalIslandOptions,
): Promise<void> {
  unmountPersonalIsland();
  installIslandStyles(ui.styleId);
  const root = document.createElement('div');
  root.id = ui.rootId;
  parent.append(root);
  activeApp = new PersonalIslandApp(root, options);
  await activeApp.mount();
}

export function unmountPersonalIsland(): void {
  activeApp?.destroy();
  activeApp = null;
  document.getElementById(ui.rootId)?.remove();
  document.getElementById(ui.styleId)?.remove();
  delete window.__SLOP_ISLAND_QA__;
}

class PersonalIslandApp {
  private readonly repository = createLocalIslandRepository();
  private readonly playerId = getOrCreateLocalPlayerId();
  private onboarding: IslandOnboardingController | null = null;
  private scene: PersonalIslandScene | null = null;
  private snapshot: IslandSnapshot | null = null;
  private menuFocus: IslandMenuFocus | null = null;
  private disposed = false;

  public constructor(
    private readonly root: HTMLElement,
    private readonly options: PersonalIslandOptions,
  ) {}

  public async mount(): Promise<void> {
    this.root.addEventListener('click', this.handleClick);
    this.installQaBridge();
    this.renderLoading();
    const forceOnboarding = consumeOnboardingFlags();
    this.snapshot = await loadIslandSnapshot(this.repository, forceOnboarding);
    if (this.disposed) {
      return;
    }
    if (this.snapshot === null) {
      this.mountOnboarding();
    } else {
      this.mountWorld(this.snapshot);
    }
  }

  public destroy(): void {
    this.disposed = true;
    this.root.removeEventListener('click', this.handleClick);
    this.menuFocus?.destroy();
    this.onboarding?.destroy();
    this.onboarding = null;
    this.scene?.destroy();
    this.scene = null;
    this.root.innerHTML = '';
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const action = target.closest<HTMLElement>('[data-island-shell-action]')
      ?.dataset.islandShellAction;
    if (action === ui.actions.camera) {
      this.cycleCamera();
    } else if (action === ui.actions.games) {
      this.setMenuOpen(true);
    } else if (action === ui.actions.closeGames) {
      this.setMenuOpen(false);
    } else if (action === ui.actions.regenerate) {
      void this.regenerate();
    }
    const gameId = target.closest<HTMLElement>('[data-island-game-id]')
      ?.dataset.islandGameId;
    if (isIslandDestinationId(gameId)) {
      this.options.onLaunchGame(gameId);
    }
  };

  private mountOnboarding(): void {
    this.scene?.destroy();
    this.scene = null;
    this.menuFocus?.destroy();
    this.menuFocus = null;
    this.onboarding?.destroy();
    this.onboarding = mountIslandOnboarding(this.root, {
      onComplete: async (preferences) => {
        this.snapshot = await createAndSaveIslandSnapshot(
          this.repository,
          this.playerId,
          preferences,
        );
        if (!this.disposed) {
          this.onboarding?.destroy();
          this.onboarding = null;
          this.mountWorld(this.snapshot);
        }
      },
    });
  }

  private mountWorld(snapshot: IslandSnapshot): void {
    document.title = 'Мой остров · SLOP';
    this.root.innerHTML = renderIslandShell(snapshot, this.options.games);
    const host = this.root.querySelector<HTMLElement>('.island-canvas-host');
    if (host === null) {
      throw new Error('Personal Island canvas host is missing.');
    }
    this.scene = new PersonalIslandScene(host, this.root, snapshot.blueprint, {
      onPortalProgress: (progress) => this.renderPortalProgress(progress),
      onLaunchGame: (destinationId) => this.options.onLaunchGame(destinationId),
      onJournalChanged: (journal) => saveIslandJournal(snapshot.blueprint.islandId, journal),
    }, loadIslandJournal(snapshot.blueprint.islandId));
    this.menuFocus = new IslandMenuFocus(this.root, () => this.setMenuOpen(false));
    this.menuFocus.setOpen(false);
    this.renderPortalProgress({ destinationId: null, progress: 0 });
  }

  private cycleCamera(): void {
    const mode = this.scene?.cycleCamera();
    const label = this.root.querySelector<HTMLElement>('[data-island-camera-label]');
    if (label !== null && mode !== undefined) {
      label.textContent = mode === 'cozy' ? 'Ближе' : mode === 'overview' ? 'Обзор' : 'Обычная';
    }
  }

  private setMenuOpen(open: boolean): void {
    this.scene?.setPaused(open);
    this.menuFocus?.setOpen(open);
    const menu = this.root.querySelector<HTMLElement>('.island-game-menu');
    menu?.classList.toggle('is-open', open);
    menu?.setAttribute('aria-hidden', String(!open));
  }

  private async regenerate(): Promise<void> {
    if (this.snapshot !== null) clearIslandJournal(this.snapshot.blueprint.islandId);
    await this.repository.clear();
    if (this.disposed) {
      return;
    }
    this.snapshot = null;
    this.setMenuOpen(false);
    this.mountOnboarding();
  }

  private renderPortalProgress(progress: IslandPortalProgress): void {
    const element = this.root.querySelector<HTMLElement>('.island-portal-progress');
    if (element === null) {
      return;
    }
    if (progress.destinationId === null || progress.progress <= 0) {
      element.classList.remove('is-visible');
      element.style.setProperty('--portal-progress', '0');
      return;
    }
    const game = this.options.games.find((entry) => entry.id === progress.destinationId);
    element.classList.add('is-visible');
    element.style.setProperty('--portal-progress', String(progress.progress));
    const label = element.querySelector<HTMLElement>('strong');
    if (label !== null) {
      label.textContent = `Входим в ${game?.name ?? 'игру'}…`;
    }
  }

  private renderLoading(): void {
    this.root.innerHTML = `
      <main class="island-loading" aria-live="polite">
        <span>🏝️</span><strong>Ищем твой остров…</strong>
      </main>
    `;
  }

  private installQaBridge(): void {
    if (new URLSearchParams(location.search).get('qa') !== '1') {
      return;
    }
    window.__SLOP_ISLAND_QA__ = {
      schemaVersion: 1,
      ready: () => this.scene !== null,
      hasSnapshot: () => this.snapshot !== null,
      scene: () => this.scene?.snapshot() ?? null,
      availableGames: () => this.options.games.map((game) => game.id),
    };
  }
}

function renderIslandShell(
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

function consumeOnboardingFlags(): boolean {
  const url = new URL(location.href);
  const force = url.searchParams.get('onboarding') === '1'
    || url.searchParams.get('resetIsland') === '1';
  if (force) {
    url.searchParams.delete('onboarding');
    url.searchParams.delete('resetIsland');
    history.replaceState(history.state, '', url);
  }
  return force;
}

function isIslandDestinationId(value: string | undefined): value is IslandDestinationId {
  return value === 'billiards'
    || value === 'parking-jam'
    || value === 'junkyard-station';
}
