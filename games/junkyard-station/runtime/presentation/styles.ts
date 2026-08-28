export const junkyardStyles = `
  :root {
    color-scheme: light;
  }

  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    background: #86c8cb;
  }

  #slop-junkyard,
  #slop-junkyard * {
    box-sizing: border-box;
  }

  #slop-junkyard {
    position: fixed;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    font-family: Inter, ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #263238;
    background: #86c8cb;
  }

  .junkyard-canvas-host,
  .junkyard-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .junkyard-canvas {
    outline: none;
  }

  .junkyard-hud {
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    right: max(12px, env(safe-area-inset-right));
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(4, minmax(64px, auto));
    gap: 8px;
    pointer-events: none;
  }

  .junkyard-resource {
    min-height: 48px;
    padding: 8px 12px;
    border: 2px solid rgb(80 69 47 / 16%);
    border-radius: 15px;
    background: #fff8e8;
    box-shadow: 0 6px 15px rgb(42 55 58 / 20%);
  }

  .junkyard-resource__label {
    display: block;
    color: #6f685b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .junkyard-resource__value {
    display: block;
    margin-top: 1px;
    font-size: 19px;
    font-weight: 900;
    line-height: 1;
  }

  .junkyard-objective {
    position: fixed;
    top: max(72px, calc(env(safe-area-inset-top) + 72px));
    left: 50%;
    z-index: 20;
    width: min(370px, calc(100vw - 32px));
    min-height: 52px;
    padding: 10px 16px;
    border-radius: 18px;
    transform: translateX(-50%);
    background: rgb(255 249 231 / 93%);
    box-shadow: 0 7px 18px rgb(35 50 54 / 18%);
    text-align: center;
    pointer-events: none;
  }

  .junkyard-objective strong {
    display: block;
    color: #3f3b33;
    font-size: 13px;
    font-weight: 900;
  }

  .junkyard-objective span {
    display: block;
    margin-top: 2px;
    color: #777063;
    font-size: 11px;
    font-weight: 700;
  }

  .junkyard-prompt {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    width: min(235px, calc(100vw - 24px));
    min-height: 54px;
    padding: 7px 12px 7px 7px;
    border-radius: 18px;
    transform: translate3d(-200vw, -200vh, 0);
    background: #fffaf0;
    box-shadow: 0 8px 22px rgb(27 39 42 / 28%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .junkyard-prompt.is-visible {
    opacity: 1;
  }

  .junkyard-prompt__icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    color: #ffffff;
    background: var(--junkyard-accent, #e98b35);
    font-size: 21px;
    font-weight: 900;
  }

  .junkyard-prompt__label,
  .junkyard-prompt__hint {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .junkyard-prompt__label {
    color: #34332f;
    font-size: 13px;
    font-weight: 900;
  }

  .junkyard-prompt__hint {
    margin-top: 2px;
    color: #777166;
    font-size: 10px;
    font-weight: 700;
  }

  .junkyard-progress {
    grid-column: 1 / -1;
    height: 4px;
    margin: 0 5px 2px;
    overflow: hidden;
    border-radius: 999px;
    background: #ded8ca;
  }

  .junkyard-progress__fill {
    width: 0;
    height: 100%;
    border-radius: inherit;
    background: var(--junkyard-accent, #e98b35);
    transition: width 80ms linear;
  }

  .world-controls {
    position: fixed;
    inset: 0;
    z-index: 35;
    pointer-events: none;
  }

  .world-joystick {
    position: absolute;
    left: max(18px, env(safe-area-inset-left));
    bottom: max(18px, env(safe-area-inset-bottom));
    width: 116px;
    height: 116px;
    border: 3px solid rgb(255 255 255 / 70%);
    border-radius: 50%;
    background: rgb(38 50 56 / 34%);
    box-shadow: 0 8px 24px rgb(20 28 31 / 22%);
    pointer-events: auto;
  }

  .world-joystick__knob {
    position: absolute;
    left: 30px;
    top: 30px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #fff6df;
    box-shadow: 0 5px 12px rgb(24 32 34 / 30%);
    will-change: transform;
  }

  .world-action {
    position: absolute;
    right: max(20px, env(safe-area-inset-right));
    bottom: max(24px, env(safe-area-inset-bottom));
    display: grid;
    place-items: center;
    width: 78px;
    height: 78px;
    border: 4px solid rgb(255 255 255 / 78%);
    border-radius: 50%;
    color: #ffffff;
    background: #6f777b;
    box-shadow: 0 8px 22px rgb(26 36 39 / 28%);
    font: 900 12px/1.05 inherit;
    pointer-events: auto;
    opacity: 0.45;
  }

  .world-action.is-available {
    background: #e98b35;
    opacity: 1;
    animation: junkyard-action-pulse 1.1s ease-in-out infinite;
  }

  .world-action:disabled {
    cursor: default;
  }

  .junkyard-pop {
    position: fixed;
    z-index: 50;
    padding: 7px 11px;
    border-radius: 12px;
    transform: translate(-50%, -50%);
    color: #ffffff;
    background: #263238;
    box-shadow: 0 5px 14px rgb(20 28 31 / 25%);
    font-size: 12px;
    font-weight: 900;
    pointer-events: none;
    animation: junkyard-pop 900ms ease-out forwards;
  }

  @keyframes junkyard-pop {
    from { opacity: 0; transform: translate(-50%, -20%); }
    20% { opacity: 1; }
    to { opacity: 0; transform: translate(-50%, -130%); }
  }

  @keyframes junkyard-action-pulse {
    50% { transform: scale(1.06); }
  }

  @media (min-width: 900px) and (pointer: fine) {
    .world-joystick {
      opacity: 0.42;
      transform: scale(0.88);
      transform-origin: bottom left;
    }

    .world-action {
      width: 64px;
      height: 64px;
    }
  }

  @media (max-width: 620px) {
    .junkyard-hud {
      top: max(10px, env(safe-area-inset-top));
      right: 10px;
      grid-template-columns: repeat(2, minmax(66px, 1fr));
      width: 154px;
      gap: 6px;
    }

    .junkyard-resource {
      min-height: 43px;
      padding: 7px 9px;
      border-radius: 13px;
    }

    .junkyard-resource__value {
      font-size: 17px;
    }

    .junkyard-objective {
      top: max(112px, calc(env(safe-area-inset-top) + 112px));
      min-height: 48px;
      padding: 9px 13px;
    }

    .world-joystick {
      width: 108px;
      height: 108px;
    }

    .world-joystick__knob {
      left: 28px;
      top: 28px;
      width: 48px;
      height: 48px;
    }
  }
`;
