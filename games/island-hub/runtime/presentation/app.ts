import { createVoyageWorld } from '../domain/voyage-world.ts';
import type { VoyageState } from '../domain/voyage-registry.ts';
import { loadVoyage, saveVoyage, clearVoyage } from '../storage/voyage-repository.ts';
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
import { loadHome, saveHome, clearHome } from '../storage/home-repository.ts';
import { loadSoundMix, saveSoundMix } from '../storage/sound-preferences.ts';
import { renderIslandShell } from './island-shell.ts';
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

  private mountWorld(snapshot: IslandSnapshot, arrivalState?: VoyageState): void {
    this.menuFocus?.destroy(); this.menuFocus = null;
    this.scene?.destroy(); this.scene = null;
    const voyage = arrivalState ? { state: arrivalState, warning: false } : loadVoyage(snapshot.blueprint);
    let world = createVoyageWorld(snapshot.blueprint, voyage.state.region);
    if (arrivalState) world = { ...world, playerSpawn: { x: world.exploration!.dock.x, z: world.exploration!.dock.z - 1.8 } };
    document.title = 'Мой остров · SLOP';
    this.root.innerHTML = renderIslandShell(snapshot, this.options.games);
    const host = this.root.querySelector<HTMLElement>('.island-canvas-host');
    if (host === null) {
      throw new Error('Personal Island canvas host is missing.');
    }
    const home = loadHome(snapshot.blueprint.islandId);
    this.scene = new PersonalIslandScene(host, this.root, world, {
      onVoyageChanged: (state) => saveVoyage(snapshot.blueprint, state),
      onTravel: (state) => this.mountWorld(snapshot, state),
      onPortalProgress: (progress) => this.renderPortalProgress(progress),
      onLaunchGame: (destinationId) => this.options.onLaunchGame(destinationId),
      onHomeChanged: (state) => saveHome(snapshot.blueprint.islandId, state),
      onSoundChanged: saveSoundMix,
      onJournalChanged: (journal) => voyage.state.region === 'home' && saveIslandJournal(snapshot.blueprint.islandId, journal),
    }, voyage.state.region === 'home' ? loadIslandJournal(snapshot.blueprint.islandId) : { completed: [] }, home.state, loadSoundMix(), voyage.state);
    if (arrivalState) this.root.querySelector('.personal-island')?.classList.add('voyage-arrival');
    if (voyage.warning) this.scene.notify("Дневник открыт в безопасном режиме. Прежняя запись сохранена для восстановления.");
    if (home.warning) this.scene.notify("Дом загружен в безопасном режиме; прежнее сохранение не удалено.");
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
    if (this.snapshot !== null) {
      clearIslandJournal(this.snapshot.blueprint.islandId); clearHome(this.snapshot.blueprint.islandId); clearVoyage(this.snapshot.blueprint.islandId);
    }
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
