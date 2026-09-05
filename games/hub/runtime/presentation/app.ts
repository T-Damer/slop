import { phosphorIcon } from '../../../shared/game-shell/phosphor.ts';
import {
  mountPersonalIsland,
  unmountPersonalIsland,
} from '../../../island-hub/runtime/presentation/app.ts';
import {
  hubCopy,
  hubGameIds,
  hubIslandGames,
  hubLegacyGameIds,
  hubParkingCompatibilityParameters,
  hubPlayableGameIds,
  hubRouteParameters,
  hubUiActions,
  hubUiAttributes,
  hubUiIds,
  isPlayableHubGameId,
  type HubGameId,
  type PlayableHubGameId,
} from './registry.ts';
import { hubStyles } from './styles.ts';

interface HubQaBridge {
  readonly schemaVersion: 1;
  readonly currentGame: () => HubGameId;
  readonly availableGames: () => ReadonlyArray<PlayableHubGameId>;
}

declare global {
  interface Window {
    __SLOP_HUB_QA__?: HubQaBridge;
  }
}

type GameUnmount = () => void;
type GameLoader = (host: HTMLElement) => Promise<GameUnmount>;

const hubGameLoaders: Readonly<Record<PlayableHubGameId, GameLoader>> = {
  [hubGameIds.billiards]: async (host) => {
    const billiards = await import(
      '../../../billiards/runtime/presentation/app.ts'
    );
    billiards.mountBilliards(host);
    return billiards.unmountBilliards;
  },
  [hubGameIds.parkingJam]: async (host) => {
    const parking = await import(
      '../../../traffic-jam/runtime/presentation/app.ts'
    );
    parking.mountParkingJam(host);
    return parking.unmountParkingJam;
  },
  [hubGameIds.junkyardTycoon]: async (host) => {
    const junkyard = await import(
      '../../../junkyard-tycoon/runtime/presentation/app.ts'
    );
    junkyard.mountJunkyardTycoon(host);
    return junkyard.unmountJunkyardTycoon;
  },
};

let activeController: GameHubController | null = null;

export function mountGameHub(parent: HTMLElement): void {
  unmountGameHub();
  installStyles();
  const root = document.createElement('div');
  root.id = hubUiIds.root;
  parent.append(root);
  activeController = new GameHubController(root);
  activeController.mount();
}

export function unmountGameHub(): void {
  activeController?.unmount();
  activeController = null;
  document.getElementById(hubUiIds.root)?.remove();
  document.getElementById(hubUiIds.style)?.remove();
}

class GameHubController {
  private currentGame: HubGameId = hubGameIds.hub;
  private activeUnmount: GameUnmount | null = null;
  private routeVersion = 0;
  private disposed = false;

  public constructor(private readonly root: HTMLElement) {}

  public mount(): void {
    this.root.addEventListener('click', this.handleClick);
    window.addEventListener('popstate', this.handlePopState);
    this.installQaBridge();
    void this.renderRoute();
  }

  public unmount(): void {
    this.disposed = true;
    this.routeVersion += 1;
    this.activeUnmount?.();
    this.activeUnmount = null;
    this.root.removeEventListener('click', this.handleClick);
    window.removeEventListener('popstate', this.handlePopState);
    delete window.__SLOP_HUB_QA__;
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const gameId = target.closest<HTMLElement>(
      `[${hubUiAttributes.gameId}]`,
    )?.getAttribute(hubUiAttributes.gameId);
    if (isPlayableHubGameId(gameId)) {
      this.navigate(gameId);
      return;
    }
    const action = target.closest<HTMLElement>(
      `[${hubUiAttributes.action}]`,
    )?.getAttribute(hubUiAttributes.action);
    if (action === hubUiActions.home) {
      this.navigate(hubGameIds.hub);
    }
  };

  private readonly handlePopState = (): void => {
    void this.renderRoute();
  };

  private navigate(gameId: HubGameId): void {
    const url = new URL(location.href);
    if (gameId === hubGameIds.hub) {
      clearGameParameters(url);
    } else {
      url.searchParams.set('game', gameId);
    }
    history.pushState({ gameId }, '', url);
    void this.renderRoute();
  }

  private async renderRoute(): Promise<void> {
    const version = ++this.routeVersion;
    const gameId = resolveGameId(location.search);
    this.activeUnmount?.();
    this.activeUnmount = null;
    this.currentGame = gameId;
    this.root.innerHTML = '';
    try {
      if (gameId === hubGameIds.hub) {
        await this.mountIslandRoute(version);
        return;
      }
      await this.mountGameRoute(gameId, version);
    } catch (error: unknown) {
      console.error(error);
      this.root.innerHTML = `<div class="slop-game-error">${hubCopy.failed}</div>`;
    }
  }

  private async mountIslandRoute(version: number): Promise<void> {
    document.title = hubCopy.islandTitle;
    await mountPersonalIsland(this.root, {
      games: hubIslandGames,
      onLaunchGame: (gameId) => this.navigate(gameId),
    });
    if (this.disposed || version !== this.routeVersion) {
      unmountPersonalIsland();
      return;
    }
    this.activeUnmount = unmountPersonalIsland;
  }

  private async mountGameRoute(
    gameId: PlayableHubGameId,
    version: number,
  ): Promise<void> {
    this.root.innerHTML = renderGameShell();
    const host = this.root.querySelector<HTMLElement>('.slop-game-host');
    if (host === null) {
      return;
    }
    const unmount = await hubGameLoaders[gameId](host);
    if (this.disposed || version !== this.routeVersion) {
      unmount();
      return;
    }
    this.activeUnmount = unmount;
  }

  private installQaBridge(): void {
    if (new URLSearchParams(location.search).get('qa') !== '1') {
      return;
    }
    window.__SLOP_HUB_QA__ = {
      schemaVersion: 1,
      currentGame: () => this.currentGame,
      availableGames: () => hubPlayableGameIds,
    };
  }
}

function renderGameShell(): string {
  return `
    <button
      class="slop-home-button"
      type="button"
      aria-label="${hubCopy.back}"
      ${hubUiAttributes.action}="${hubUiActions.home}"
    >${phosphorIcon('house')}</button>
    <div class="slop-game-host">
      <div class="slop-game-loading">${hubCopy.loading}</div>
    </div>
  `;
}

function resolveGameId(search: string): HubGameId {
  const params = new URLSearchParams(search);
  const requested = params.get('game');
  if (requested === hubLegacyGameIds.junkyardTycoon) {
    return hubGameIds.junkyardTycoon;
  }
  if (isPlayableHubGameId(requested)) {
    return requested;
  }
  if (hubParkingCompatibilityParameters.some((parameter) => params.has(parameter))) {
    return hubGameIds.parkingJam;
  }
  return hubGameIds.hub;
}

function clearGameParameters(url: URL): void {
  for (const parameter of hubRouteParameters) {
    url.searchParams.delete(parameter);
  }
}

function installStyles(): void {
  if (document.getElementById(hubUiIds.style) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = hubUiIds.style;
  style.textContent = hubStyles;
  document.head.append(style);
}
