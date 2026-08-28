const gameNavigationUi = {
  styleId: 'slop-game-navigation-style',
  className: 'slop-game-nav',
  labelPrefix: 'Back to game hub from',
  arrow: '←',
} as const;

const gameNavigationStyles = `
  .slop-game-nav {
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    z-index: 10000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 16px;
    background: #fff8e6;
    color: #263238;
    box-shadow: 0 8px 20px rgb(39 48 54 / 24%);
    font: 800 24px/1 system-ui, sans-serif;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .slop-game-nav:hover,
  .slop-game-nav:focus-visible {
    transform: translateY(-1px);
    background: #ffffff;
    outline: 3px solid #ffbf47;
    outline-offset: 2px;
  }
`;

export function mountGameNavigation(
  parent: HTMLElement,
  gameName: string,
): () => void {
  installGameNavigationStyles();
  const link = document.createElement('a');
  link.className = gameNavigationUi.className;
  link.href = resolveHubUrl();
  link.textContent = gameNavigationUi.arrow;
  link.setAttribute('aria-label', `${gameNavigationUi.labelPrefix} ${gameName}`);
  parent.append(link);
  return () => link.remove();
}

function resolveHubUrl(): string {
  const url = new URL('../../', window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function installGameNavigationStyles(): void {
  if (document.getElementById(gameNavigationUi.styleId) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = gameNavigationUi.styleId;
  style.textContent = gameNavigationStyles;
  document.head.append(style);
}
