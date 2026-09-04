export const billiardsInteractionStylesV2 = `
#slop-billiards-root {
  --billiards-room-art: none !important;
  background:
    radial-gradient(ellipse at 50% 42%, rgba(151, 90, 39, .18), transparent 44%),
    linear-gradient(90deg, rgba(0, 0, 0, .55), transparent 22% 78%, rgba(0, 0, 0, .55)),
    repeating-linear-gradient(135deg, rgba(115, 59, 27, .16) 0 2px, transparent 2px 34px),
    repeating-linear-gradient(45deg, rgba(58, 29, 16, .24) 0 32px, rgba(19, 10, 7, .4) 32px 64px),
    #100805 !important;
}

#slop-billiards-root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 18%, rgba(255, 197, 102, .14), transparent 29%),
    radial-gradient(ellipse at 26% 80%, rgba(111, 52, 22, .12), transparent 34%),
    linear-gradient(180deg, rgba(10, 5, 3, .04), rgba(0, 0, 0, .58));
}

#slop-billiards-root[data-interaction-mode='placing-cue-ball'] #slop-billiards-canvas {
  cursor: copy;
}

#slop-billiards-root[data-interaction-mode='aiming'] #slop-billiards-canvas {
  cursor: crosshair;
}

#slop-billiards-root[data-interaction-mode='aim-locked'] #slop-billiards-canvas {
  cursor: grab;
  outline: 2px solid rgba(231, 179, 86, .44);
  outline-offset: 3px;
}

#slop-billiards-root[data-interaction-mode='manual-stroke'] #slop-billiards-canvas {
  cursor: grabbing;
  outline: 3px solid rgba(246, 200, 112, .62);
  outline-offset: 3px;
}

#slop-billiards-root[data-interaction-mode='aim-locked'] [data-billiards-shoot],
#slop-billiards-root[data-interaction-mode='manual-stroke'] [data-billiards-shoot] {
  box-shadow:
    inset 0 1px rgba(255, 255, 255, .17),
    0 0 0 2px rgba(224, 172, 79, .52),
    0 0 20px rgba(225, 160, 57, .34);
  animation: billiards-ready-pulse 1.35s ease-in-out infinite;
}

#slop-billiards-root[data-quality='balanced'] .billiards-smoke-wisp:nth-child(n + 4),
#slop-billiards-root[data-quality='low'] .billiards-smoke-wisp,
#slop-billiards-root[data-quality='low'] .billiards-dust-layer {
  display: none;
}

#slop-billiards-root[data-quality='low'] #slop-billiards-canvas {
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, .48));
}

@keyframes billiards-ready-pulse {
  0%, 100% { transform: translateY(0); filter: brightness(1); }
  50% { transform: translateY(-1px); filter: brightness(1.12); }
}

@media (orientation: portrait) {
  #slop-billiards-root .billiards-shell {
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    padding-inline: max(8px, env(safe-area-inset-left));
  }

  #slop-billiards-root .billiards-header {
    min-height: 42px;
    padding-left: 50px;
  }

  #slop-billiards-root .billiards-brand p,
  #slop-billiards-root .billiards-table-hint {
    display: none;
  }

  #slop-billiards-root .billiards-scoreboard {
    min-height: 88px;
  }

  #slop-billiards-root .billiards-scoreboard-frame {
    grid-template-columns: minmax(0, 1fr) minmax(86px, .55fr) minmax(0, 1fr);
    padding: 9px 12px;
  }

  #slop-billiards-root .billiards-player {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 4px;
  }

  #slop-billiards-root .billiards-player[data-player-index='1'] {
    grid-template-columns: minmax(0, 1fr) 28px;
  }

  #slop-billiards-root .billiards-avatar {
    width: 28px;
    height: 28px;
    font-size: .56rem;
  }

  #slop-billiards-root .billiards-pocket-slots {
    grid-column: 1 / -1;
    gap: 2px;
  }

  #slop-billiards-root .billiards-stage {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 62px minmax(0, 1fr) 62px !important;
    align-items: center;
    justify-items: center;
    gap: 7px;
  }

  #slop-billiards-root [data-billiards-power-rail] {
    grid-column: 1 !important;
    grid-row: 1 !important;
    width: min(82vw, 430px) !important;
    height: 56px !important;
    min-height: 56px !important;
    writing-mode: horizontal-tb;
  }

  #slop-billiards-root .billiards-table-wrap {
    grid-column: 1 !important;
    grid-row: 2 !important;
    position: relative;
    width: min(78vw, calc((100dvh - 310px) * 9 / 16)) !important;
    max-width: none !important;
    max-height: calc(100dvh - 310px) !important;
    aspect-ratio: 9 / 16;
    overflow: visible;
  }

  #slop-billiards-root #slop-billiards-canvas {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 177.7778% !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
    transform: translate(-50%, -50%) rotate(90deg);
    transform-origin: 50% 50%;
  }

  #slop-billiards-root [data-billiards-angle-rail] {
    grid-column: 1 !important;
    grid-row: 3 !important;
    width: min(82vw, 430px) !important;
    height: 56px !important;
    min-height: 56px !important;
    writing-mode: horizontal-tb;
  }

  #slop-billiards-root .billiards-controls {
    width: 100%;
    min-height: 58px;
  }
}

@media (orientation: portrait) and (max-height: 720px) {
  #slop-billiards-root .billiards-scoreboard { min-height: 68px; }
  #slop-billiards-root .billiards-stage {
    grid-template-rows: 48px minmax(0, 1fr) 48px !important;
  }
  #slop-billiards-root [data-billiards-power-rail],
  #slop-billiards-root [data-billiards-angle-rail] {
    height: 44px !important;
    min-height: 44px !important;
  }
  #slop-billiards-root .billiards-table-wrap {
    width: min(70vw, calc((100dvh - 260px) * 9 / 16)) !important;
    max-height: calc(100dvh - 260px) !important;
  }
}
`;
