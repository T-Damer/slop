export const junkyardStyles = `
#slop-junkyard-tycoon {
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: #fff8e8;
  background: #8fd7f0;
  font-family: Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  touch-action: none;
  user-select: none;
}

#slop-junkyard-tycoon * {
  box-sizing: border-box;
}

.junkyard-canvas-host,
.junkyard-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.junkyard-canvas {
  display: block;
}

.junkyard-hud {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.junkyard-resource-strip {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  left: max(14px, env(safe-area-inset-left));
  display: flex;
  gap: 8px;
}

.junkyard-resource {
  min-width: 88px;
  padding: 10px 13px;
  border: 3px solid rgba(65, 43, 31, 0.36);
  border-radius: 17px;
  background: rgba(48, 38, 31, 0.86);
  box-shadow: 0 7px 0 rgba(68, 40, 24, 0.22);
  font-weight: 900;
  letter-spacing: 0.02em;
}

.junkyard-resource span {
  display: block;
  margin-top: 2px;
  font-size: 1.05rem;
}

.junkyard-objective {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  left: 50%;
  width: min(340px, calc(100vw - 190px));
  transform: translateX(-50%);
  padding: 11px 16px 12px;
  border: 3px solid rgba(75, 48, 31, 0.28);
  border-radius: 18px;
  background: rgba(255, 247, 223, 0.94);
  color: #3f3027;
  box-shadow: 0 7px 0 rgba(92, 55, 28, 0.2);
  text-align: center;
}

.junkyard-objective strong {
  display: block;
  font-size: clamp(0.92rem, 2.4vw, 1.08rem);
}

.junkyard-progress {
  height: 8px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(84, 60, 42, 0.18);
}

.junkyard-progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff9c3d, #ffd74f);
  transition: width 180ms ease-out;
}

.junkyard-message {
  position: absolute;
  left: 50%;
  bottom: max(82px, calc(env(safe-area-inset-bottom) + 72px));
  width: min(420px, calc(100vw - 32px));
  min-height: 42px;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 15px;
  background: rgba(48, 38, 31, 0.82);
  box-shadow: 0 5px 0 rgba(54, 32, 19, 0.18);
  text-align: center;
  font-weight: 800;
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}

.junkyard-message:empty {
  opacity: 0;
  transform: translate(-50%, 8px);
}

.junkyard-action-bubble {
  --interaction-progress: 0%;
  position: absolute;
  z-index: 6;
  width: 60px;
  height: 60px;
  transform: translate(-50%, -100%);
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at center, #fff8e7 52%, transparent 54%),
    conic-gradient(#ffbd32 var(--interaction-progress), rgba(45, 35, 29, 0.38) 0);
  box-shadow: 0 6px 0 rgba(64, 39, 24, 0.24);
  color: #3d3027;
  font-size: 28px;
  opacity: 0;
  transition: opacity 120ms ease-out;
  pointer-events: none;
}

.junkyard-action-bubble.is-visible {
  opacity: 1;
}

.junkyard-controls {
  position: absolute;
  right: max(14px, env(safe-area-inset-right));
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 7;
  pointer-events: auto;
}

.junkyard-reset {
  min-width: 48px;
  min-height: 48px;
  border: 0;
  border-radius: 16px;
  background: rgba(48, 38, 31, 0.84);
  color: white;
  box-shadow: 0 5px 0 rgba(54, 32, 19, 0.22);
  font-size: 22px;
  cursor: pointer;
}

.junkyard-joystick {
  position: absolute;
  left: max(18px, env(safe-area-inset-left));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 8;
  width: 124px;
  height: 124px;
  pointer-events: auto;
}

.junkyard-joystick-base {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(255, 255, 255, 0.38);
  border-radius: 50%;
  background: rgba(48, 38, 31, 0.25);
  box-shadow: inset 0 0 0 7px rgba(255, 255, 255, 0.08);
  touch-action: none;
}

.junkyard-joystick-knob {
  position: absolute;
  top: 35px;
  left: 35px;
  width: 54px;
  height: 54px;
  border: 3px solid rgba(255, 255, 255, 0.62);
  border-radius: 50%;
  background: rgba(48, 38, 31, 0.72);
  box-shadow: 0 5px 0 rgba(54, 32, 19, 0.2);
  pointer-events: none;
  will-change: transform;
}

@media (hover: hover) and (pointer: fine) {
  .junkyard-joystick {
    opacity: 0.42;
  }
}

@media (max-width: 620px) {
  .junkyard-resource-strip {
    gap: 6px;
  }

  .junkyard-resource {
    min-width: 72px;
    padding: 8px 10px;
    border-radius: 14px;
    font-size: 0.72rem;
  }

  .junkyard-objective {
    top: 76px;
    width: min(300px, calc(100vw - 30px));
  }

  .junkyard-message {
    bottom: max(150px, calc(env(safe-area-inset-bottom) + 142px));
    width: min(300px, calc(100vw - 32px));
    font-size: 0.78rem;
  }

  .junkyard-joystick {
    width: 112px;
    height: 112px;
  }

  .junkyard-joystick-knob {
    top: 32px;
    left: 32px;
    width: 48px;
    height: 48px;
  }
}
`;
