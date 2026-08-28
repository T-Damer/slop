import { hubGameCatalog } from './catalog.js';

const hubUi = {
  rootSelector: '#slop-game-hub',
  listSelector: '[data-game-list]',
  cardClass: 'game-card',
  iconClass: 'game-card__icon',
  title: 'Slop Games',
} ;

const iconRenderers = {
  junkyard: renderJunkyardIcon,
  parking: renderParkingIcon,
};

bootGameHub();

function bootGameHub() {
  const root = document.querySelector(hubUi.rootSelector);
  const list = document.querySelector(hubUi.listSelector);
  if (!(root instanceof HTMLElement) || !(list instanceof HTMLElement)) {
    throw new Error('Game hub root is missing.');
  }
  document.title = hubUi.title;
  for (const game of hubGameCatalog) {
    list.append(createGameCard(game));
  }
  root.classList.add('is-ready');
}

function createGameCard(game) {
  const link = document.createElement('a');
  link.className = hubUi.cardClass;
  link.href = game.path;
  link.dataset.gameId = game.id;
  link.setAttribute('aria-label', `Play ${game.title}`);

  const icon = document.createElement('span');
  icon.className = hubUi.iconClass;
  icon.setAttribute('aria-hidden', 'true');
  const renderIcon = iconRenderers[game.icon];
  if (renderIcon) {
    icon.append(renderIcon());
  }

  const copy = document.createElement('span');
  copy.className = 'game-card__copy';
  const badge = document.createElement('span');
  badge.className = 'game-card__badge';
  badge.textContent = game.badge;
  const title = document.createElement('strong');
  title.textContent = game.title;
  const description = document.createElement('span');
  description.className = 'game-card__description';
  description.textContent = game.description;
  copy.append(badge, title, description);

  const action = document.createElement('span');
  action.className = 'game-card__action';
  action.textContent = 'Play →';
  link.append(icon, copy, action);
  return link;
}

function renderJunkyardIcon() {
  const svg = createSvg();
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.append(
    svgPath('M18 81h84v17H18z', '#4b565b'),
    svgPath('M28 70l18-27 26 8 18 19z', '#7f8d91'),
    svgPath('M25 59l18-8 8 14-19 8z', '#e98b35'),
    svgPath('M72 33h21v42H72z', '#f5e0ad'),
    svgPath('M77 39h11v12H77z', '#91c9cf'),
    svgPath('M89 50c12 5 10 19 1 23', 'none', '#39474d', 5),
    svgCircle(42, 87, 9, '#22282b'),
    svgCircle(82, 87, 9, '#22282b'),
  );
  return svg;
}

function renderParkingIcon() {
  const svg = createSvg();
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.append(
    svgPath('M15 26h90v72H15z', '#596268'),
    svgPath('M27 35v54M49 35v54M71 35v54M93 35v54', 'none', '#f5e0ad', 3),
    svgPath('M31 45h28l8 12v19H23V57z', '#51b98e'),
    svgPath('M68 61h28l7 10v14H61V71z', '#e8573d'),
    svgCircle(34, 77, 6, '#22282b'),
    svgCircle(56, 77, 6, '#22282b'),
    svgCircle(72, 85, 6, '#22282b'),
    svgCircle(94, 85, 6, '#22282b'),
  );
  return svg;
}

function createSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'presentation');
  return svg;
}

function svgPath(d, fill, stroke, strokeWidth) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill);
  if (stroke) {
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', String(strokeWidth ?? 1));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  }
  return path;
}

function svgCircle(cx, cy, radius, fill) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(radius));
  circle.setAttribute('fill', fill);
  return circle;
}
