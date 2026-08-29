import { renderHubIcon } from './icons.ts';
import {
  hubCopy,
  hubGameIds,
  hubGames,
  hubLegacyGameIds,
  hubUiActions,
  hubUiAttributes,
  hubUiIds,
  type HubGameId,
} from './registry.ts';
import { hubStyles } from './styles.ts';

interface HubQaBridge {
  readonly schemaVersion: 1;
  readonly currentGame: () => HubGameId;
  readonly availableGames: () => ReadonlyArray<string>;
}

declare global {
  interface Window {
    __SLOP_HUB_QA__?: HubQaBridge;
  }
}

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
  private activeUnmount: (() => void) | null = null;
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
    const gameCard = target.closest<HTMLElement>(
      `[${hubUiAttributes.gameId}]`,
    );
    const gameId = gameCard?.getAttribute(hubUiAttributes.gameId);
    if (isPlayableGameId(gameId)) {
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
      url.searchParams.delete('game');
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
    if (gameId === hubGameIds.hub) {
      document.title = hubCopy.title;
      this.root.innerHTML = renderHub();
      return;
    }

    this.root.innerHTML = `
      <button
        class="slop-home-button"
        type="button"
        aria-label="${hubCopy.back}"
        ${hubUiAttributes.action}="${hubUiActions.home}"
      >⌂</button>
      <div class="slop-game-host">
        <div class="slop-game-loading">${hubCopy.loading}</div>
      </div>
    `;
    const host = this.root.querySelector<HTMLElement>('.slop-game-host');
    if (host === null) {
      return;
    }
    try {
      const unmount = await mountSelectedGame(gameId, host);
      if (this.disposed || version !== this.routeVersion) {
        unmount();
        return;
      }
      this.activeUnmount = unmount;
    } catch (error: unknown) {
      console.error(error);
      host.innerHTML = `<div class="slop-game-error">${hubCopy.failed}</div>`;
    }
  }

  private installQaBridge(): void {
    if (new URLSearchParams(location.search).get('qa') !== '1') {
      return;
    }
    window.__SLOP_HUB_QA__ = {
      schemaVersion: 1,
      currentGame: () => this.currentGame,
      availableGames: () => hubGames.map((game) => game.id),
    };
  }
}

async function mountSelectedGame(
  gameId: Exclude<HubGameId, 'hub'>,
  host: HTMLElement,
): Promise<() => void> {
  host.innerHTML = '';
  if (gameId === hubGameIds.parkingJam) {
    const parking = await import(
      '../../../traffic-jam/runtime/presentation/app.ts'
    );
    parking.mountParkingJam(host);
    return parking.unmountParkingJam;
  }
  const junkyard = await import(
    '../../../junkyard-tycoon/runtime/presentation/app.ts'
  );
  junkyard.mountJunkyardTycoon(host);
  return junkyard.unmountJunkyardTycoon;
}

function renderHub(): string {
  return `
    <main class="slop-hub" id="${hubUiIds.hub}">
      <header class="slop-hub-header">
        <p class="slop-hub-eyebrow">${hubCopy.eyebrow}</p>
        <h1>${hubCopy.heading}</h1>
        <p class="slop-hub-subtitle">${hubCopy.subtitle}</p>
      </header>
      <section class="slop-game-grid" aria-label="${hubCopy.heading}">
        ${hubGames.map((game) => `
          <button
            class="slop-game-card"
            type="button"
            ${hubUiAttributes.gameId}="${game.id}"
          >
            <span class="slop-game-art">
              <span class="slop-game-badge">${game.badge}</span>
              ${renderHubIcon(game.icon)}
            </span>
            <h2>${game.name}</h2>
            <p>${game.description}</p>
          </button>
        `).join('')}
      </section>
    </main>
  `;
}

function resolveGameId(search: string): HubGameId {
  const params = new URLSearchParams(search);
  const requested = params.get('game');
  if (requested === hubLegacyGameIds.junkyardTycoon) {
    return hubGameIds.junkyardTycoon;
  }
  if (isPlayableGameId(requested)) {
    return requested;
  }
  if (
    params.has('level')
    || params.has('seed')
    || params.has('viewport')
  ) {
    return hubGameIds.parkingJam;
  }
  return hubGameIds.hub;
}

function isPlayableGameId(
  value: string | null | undefined,
): value is Exclude<HubGameId, 'hub'> {
  return value === hubGameIds.parkingJam
    || value === hubGameIds.junkyardTycoon;
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
