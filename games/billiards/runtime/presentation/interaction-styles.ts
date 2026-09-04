const enhancedStyleId = 'slop-billiards-interaction-style';

export function installBilliardsInteractionStyles(): () => void {
  if (document.getElementById(enhancedStyleId) === null) {
    const style = document.createElement('style');
    style.id = enhancedStyleId;
    style.textContent = enhancedStyles;
    document.head.append(style);
  }
  return () => document.getElementById(enhancedStyleId)?.remove();
}

export function installBilliardsRoomMasks(root: HTMLElement): () => void {
  const left = document.createElement('div');
  const right = document.createElement('div');
  left.className = 'billiards-room-mask billiards-room-mask-left';
  right.className = 'billiards-room-mask billiards-room-mask-right';
  left.setAttribute('aria-hidden', 'true');
  right.setAttribute('aria-hidden', 'true');
  root.prepend(right);
  root.prepend(left);
  return () => {
    left.remove();
    right.remove();
  };
}

const enhancedStyles = `
#slop-billiards-root[data-interaction-mode="placing"] #slop-billiards-canvas {
  cursor: copy;
}

#slop-billiards-root[data-interaction-mode="aiming"] #slop-billiards-canvas {
  cursor: crosshair;
}

#slop-billiards-root[data-interaction-mode="locked"] #slop-billiards-canvas {
  cursor: grab;
}

#slop-billiards-root[data-interaction-mode="stroking"] #slop-billiards-canvas {
  cursor: grabbing;
}

#slop-billiards-root[data-interaction-mode="locked"] [data-billiards-shoot],
#slop-billiards-root[data-interaction-mode="stroking"] [data-billiards-shoot],
#slop-billiards-root[data-interaction-mode="placing"] [data-billiards-shoot] {
  outline: 2px solid rgba(235, 190, 103, 0.68);
  outline-offset: 3px;
  box-shadow:
    inset 0 1px 0 rgba(255, 242, 207, 0.22),
    0 0 0 4px rgba(177, 116, 43, 0.16),
    0 8px 22px rgba(0, 0, 0, 0.48);
}

#slop-billiards-root[data-interaction-mode="locked"] [data-billiards-shoot] {
  animation: billiards-primary-ready 1.25s ease-in-out infinite;
}

.billiards-room-mask {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  width: clamp(54px, 11vw, 180px);
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(8, 4, 2, 0.96), rgba(25, 12, 6, 0.91) 62%, rgba(25, 12, 6, 0)),
    repeating-linear-gradient(77deg, rgba(132, 72, 36, 0.08) 0 2px, transparent 2px 13px);
}

.billiards-room-mask-left { left: 0; }
.billiards-room-mask-right {
  right: 0;
  transform: scaleX(-1);
}

#slop-billiards-root[data-quality-tier="low"] .billiards-smoke,
#slop-billiards-root[data-quality-tier="low"] .billiards-dust,
#slop-billiards-root[data-quality-tier="low"] .billiards-smoke-wisp {
  display: none !important;
}

#slop-billiards-root[data-quality-tier="balanced"] .billiards-smoke-wisp:nth-child(n + 4) {
  display: none !important;
}

@keyframes billiards-primary-ready {
  0%, 100% { filter: brightness(1); transform: translateY(0); }
  50% { filter: brightness(1.14); transform: translateY(-1px); }
}

@media (orientation: portrait) and (max-width: 900px) {
  #slop-billiards-root .billiards-shell {
    gap: 4px !important;
    padding-left: max(6px, env(safe-area-inset-left)) !important;
    padding-right: max(6px, env(safe-area-inset-right)) !important;
  }

  #slop-billiards-root .billiards-stage {
    width: 100% !important;
    min-height: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: clamp(50px, 7.5vh, 68px) minmax(0, 1fr) clamp(50px, 7.5vh, 68px) !important;
    gap: 5px !important;
    align-items: center !important;
  }

  #slop-billiards-root .billiards-power-control {
    grid-column: 1 !important;
    grid-row: 1 !important;
    justify-self: center !important;
    width: min(76vw, 330px) !important;
    height: 58px !important;
    min-height: 0 !important;
    transform: rotate(90deg) scale(0.86) !important;
    transform-origin: center !important;
  }

  #slop-billiards-root .billiards-table-wrap {
    grid-column: 1 !important;
    grid-row: 2 !important;
    width: min(100%, calc((100dvh - 270px) * 9 / 16)) !important;
    height: auto !important;
    max-height: 100% !important;
  }

  #slop-billiards-root #slop-billiards-canvas {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 9 / 16 !important;
  }

  #slop-billiards-root .billiards-angle-control {
    grid-column: 1 !important;
    grid-row: 3 !important;
    justify-self: center !important;
    width: min(76vw, 330px) !important;
    height: 58px !important;
    min-height: 0 !important;
    transform: rotate(90deg) scale(0.86) !important;
    transform-origin: center !important;
  }

  #slop-billiards-root .billiards-room-mask {
    width: 38px;
    opacity: 0.72;
  }
}

@media (prefers-reduced-motion: reduce) {
  #slop-billiards-root[data-interaction-mode="locked"] [data-billiards-shoot] {
    animation: none;
  }
}
`;
