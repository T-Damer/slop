export const billiardsInteractionStylesV2 = `
#slop-billiards-root {
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


#slop-billiards-root .billiards-controls > .billiards-table-hint {
  position: static; display: block; transform: none; max-width: 100%;
  margin: 0; padding: 2px 4px; border: 0; background: none;
  white-space: normal; font-size: 11px; line-height: 1.15;
}
#slop-billiards-root .billiards-icon-button { width: 44px; height: 44px; }
#slop-billiards-root[data-can-interact='false'] { cursor: default; }

@media (orientation: portrait) {
  #slop-billiards-root .billiards-shell {
    grid-template-rows: 44px 62px minmax(0, 1fr) 74px;
    gap: 4px; padding: 6px max(6px, env(safe-area-inset-right)) 6px max(6px, env(safe-area-inset-left));
  }
  #slop-billiards-root .billiards-header { min-height: 0; }
  #slop-billiards-root .billiards-brand { padding-left: 48px; }
  #slop-billiards-root .billiards-brand p,
  #slop-billiards-root .billiards-avatar,
  #slop-billiards-root .billiards-spin-copy { display: none; }
  #slop-billiards-root .billiards-scoreboard {
    min-height: 0; grid-template-columns: minmax(0, 1fr) 80px minmax(0, 1fr);
    padding: 4px 6px; gap: 3px;
  }
  #slop-billiards-root .billiards-player { grid-template-columns: minmax(0, 1fr); padding: 2px; }
  #slop-billiards-root .billiards-pocketed-balls { grid-template-columns: repeat(7, minmax(8px, 12px)); gap: 2px; }
  #slop-billiards-root .billiards-status { font-size: 10px; padding: 2px; }
  #slop-billiards-root .billiards-table-wrap { width: 100%; height: 100%; min-height: 0; }
  #slop-billiards-root .billiards-stage {
    width: min(calc(100vw - 108px), calc((100dvh - 204px) * 9 / 16));
    height: auto; aspect-ratio: 9 / 16; position: relative;
  }
  #slop-billiards-root #slop-billiards-canvas {
    position: absolute; inset: auto; left: 50%; top: 50%;
    width: 177.7777778%; height: 56.25%; max-width: none; max-height: none;
    transform: translate(-50%, -50%) rotate(90deg); transform-origin: center;
  }
  #slop-billiards-root .billiards-side-control {
    position: absolute; top: 50%; height: min(74%, 280px); width: 44px;
    transform: translateY(-50%); writing-mode: horizontal-tb;
  }
  #slop-billiards-root .billiards-power-control { left: -48px; }
  #slop-billiards-root .billiards-angle-control { right: -48px; }
  #slop-billiards-root .billiards-controls { grid-template-columns: minmax(0, 1fr) auto; gap: 3px; }
  #slop-billiards-root .billiards-spin-control { min-height: 46px; padding: 0 5px; grid-template-columns: 44px auto; gap: 5px; }
  #slop-billiards-root .billiards-spin-pad { width: 44px; height: 44px; }
  #slop-billiards-root .billiards-actions { grid-template-columns: minmax(94px, 1fr) 44px; gap: 4px; }
  #slop-billiards-root .billiards-button { min-height: 46px; min-width: 44px; padding: 0 8px; font-size: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  #slop-billiards-root * { animation: none !important; transition: none !important; }
}
`;
