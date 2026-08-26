export const trafficStyles = String.raw`
:root {
  color-scheme: dark;
  --traffic-bg-0: #111317;
  --traffic-bg-1: #1b2027;
  --traffic-panel: rgba(29, 34, 42, 0.82);
  --traffic-panel-strong: rgba(23, 27, 34, 0.96);
  --traffic-ink: #f7f7f2;
  --traffic-muted: #9ea7b4;
  --traffic-line: rgba(255, 255, 255, 0.09);
  --traffic-road: #303641;
  --traffic-road-line: rgba(255, 255, 255, 0.055);
  --traffic-accent: #f6d365;
  --traffic-danger: #ff806f;
  --traffic-success: #70e1a1;
  --traffic-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

html,
body,
#root {
  width: 100%;
  min-width: 100%;
  min-height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--traffic-bg-0);
}

#slop-traffic-jam {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: grid;
  place-items: center;
  overflow: auto;
  overscroll-behavior: none;
  padding: max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  color: var(--traffic-ink);
  background:
    radial-gradient(circle at 16% 10%, rgba(91, 113, 255, 0.17), transparent 32%),
    radial-gradient(circle at 86% 92%, rgba(255, 119, 92, 0.12), transparent 35%),
    linear-gradient(145deg, var(--traffic-bg-0), var(--traffic-bg-1));
  -webkit-tap-highlight-color: transparent;
}

.traffic-app {
  width: min(100%, 620px);
  display: grid;
  gap: 16px;
  opacity: 1;
  transform: translateY(0);
  animation: traffic-enter 420ms cubic-bezier(.2,.8,.2,1) both;
}

.traffic-header,
.traffic-toolbar,
.traffic-status,
.traffic-complete-card {
  border: 1px solid var(--traffic-line);
  background: var(--traffic-panel);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: var(--traffic-shadow);
}

.traffic-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 18px;
  padding: 18px 20px;
  border-radius: 24px;
}

.traffic-eyebrow {
  margin: 0 0 5px;
  color: var(--traffic-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .2em;
}

.traffic-title {
  margin: 0;
  font-size: clamp(28px, 8vw, 44px);
  line-height: .96;
  letter-spacing: -.055em;
}

.traffic-level-name {
  margin: 8px 0 0;
  color: var(--traffic-muted);
  font-size: 13px;
}

.traffic-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(54px, auto));
  gap: 7px;
}

.traffic-stat {
  min-width: 58px;
  padding: 10px 9px 9px;
  border: 1px solid var(--traffic-line);
  border-radius: 15px;
  text-align: center;
  background: rgba(255, 255, 255, 0.035);
}

.traffic-stat-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.traffic-stat-label {
  display: block;
  margin-top: 2px;
  color: var(--traffic-muted);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .14em;
}

.traffic-board-wrap {
  position: relative;
  width: min(100%, 590px);
  justify-self: center;
  padding: 11px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 30px;
  background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.015));
  box-shadow: var(--traffic-shadow), inset 0 1px rgba(255,255,255,.11);
}

.traffic-board {
  --traffic-cell: calc(100% / 6);
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 21px;
  background-color: var(--traffic-road);
  background-image:
    linear-gradient(var(--traffic-road-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--traffic-road-line) 1px, transparent 1px),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.035), transparent 62%);
  background-size: var(--traffic-cell) var(--traffic-cell), var(--traffic-cell) var(--traffic-cell), 100% 100%;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35), inset 0 18px 38px rgba(0,0,0,.14);
}

.traffic-board::before,
.traffic-board::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.traffic-board::before {
  background: repeating-linear-gradient(90deg, transparent 0 8%, rgba(255,255,255,.025) 8% 8.5%, transparent 8.5% 16.5%);
  opacity: .36;
}

.traffic-board::after {
  border: 10px solid rgba(12,14,18,.28);
  border-radius: inherit;
  box-shadow: inset 0 0 22px rgba(0,0,0,.25);
}

.traffic-vehicle {
  --x: 0;
  --y: 0;
  --vehicle-w: 1;
  --vehicle-h: 1;
  --vehicle-color: #fff;
  --arrow-angle: 0deg;
  position: absolute;
  left: calc(var(--x) * var(--traffic-cell) + 5px);
  top: calc(var(--y) * var(--traffic-cell) + 5px);
  width: calc(var(--vehicle-w) * var(--traffic-cell) - 10px);
  height: calc(var(--vehicle-h) * var(--traffic-cell) - 10px);
  z-index: 2;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 17px;
  cursor: pointer;
  color: rgba(18, 21, 25, .82);
  background-color: var(--vehicle-color);
  background:
    linear-gradient(145deg, rgba(255,255,255,.48), transparent 29%),
    linear-gradient(180deg, var(--vehicle-color), color-mix(in srgb, var(--vehicle-color) 72%, black));
  box-shadow:
    0 8px 13px rgba(0,0,0,.31),
    inset 0 -4px 7px rgba(0,0,0,.18),
    inset 0 2px 3px rgba(255,255,255,.42);
  transition:
    transform 460ms cubic-bezier(.34,.74,.18,1),
    filter 180ms ease,
    box-shadow 180ms ease,
    opacity 300ms ease;
  touch-action: manipulation;
}

.traffic-vehicle::before,
.traffic-vehicle::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.traffic-vehicle::before {
  inset: 16% 18%;
  border-radius: 10px;
  border: 2px solid rgba(20, 24, 29, .19);
  background: linear-gradient(145deg, rgba(255,255,255,.26), rgba(20,24,29,.08));
}

.traffic-vehicle::after {
  inset: auto 15% 8%;
  height: 8%;
  border-radius: 999px;
  background: rgba(20,24,29,.23);
  filter: blur(1px);
}

.traffic-vehicle:hover,
.traffic-vehicle:focus-visible {
  outline: none;
  filter: brightness(1.12) saturate(1.08);
  box-shadow:
    0 11px 22px rgba(0,0,0,.38),
    0 0 0 3px rgba(255,255,255,.18),
    inset 0 -4px 7px rgba(0,0,0,.18),
    inset 0 2px 3px rgba(255,255,255,.48);
}

.traffic-arrow {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  transform: rotate(var(--arrow-angle));
  color: rgba(16, 18, 21, .76);
  background: rgba(255,255,255,.43);
  box-shadow: 0 2px 7px rgba(0,0,0,.17), inset 0 1px rgba(255,255,255,.5);
  font-size: 21px;
  font-weight: 900;
  line-height: 1;
}

.traffic-vehicle.is-blocked {
  animation: traffic-shake 360ms ease both;
  box-shadow: 0 0 0 4px rgba(255,128,111,.46), 0 8px 13px rgba(0,0,0,.31);
}

.traffic-vehicle.is-blocking {
  animation: traffic-blocker 640ms ease both;
}

.traffic-vehicle.is-hinted {
  animation: traffic-hint 1200ms ease both;
}

.traffic-vehicle[data-direction="right"].is-exiting { transform: translateX(820%); opacity: 0; }
.traffic-vehicle[data-direction="left"].is-exiting { transform: translateX(-820%); opacity: 0; }
.traffic-vehicle[data-direction="down"].is-exiting { transform: translateY(820%); opacity: 0; }
.traffic-vehicle[data-direction="up"].is-exiting { transform: translateY(-820%); opacity: 0; }

.traffic-toolbar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  padding: 10px;
  border-radius: 20px;
}

.traffic-action {
  min-height: 48px;
  border: 1px solid var(--traffic-line);
  border-radius: 14px;
  color: var(--traffic-ink);
  background: rgba(255,255,255,.045);
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease, opacity 140ms ease;
}

.traffic-action:hover:not(:disabled),
.traffic-action:focus-visible:not(:disabled) {
  outline: none;
  transform: translateY(-1px);
  background: rgba(255,255,255,.09);
}

.traffic-action:active:not(:disabled) { transform: translateY(1px); }
.traffic-action:disabled { cursor: default; opacity: .34; }
.traffic-action-symbol { margin-right: 6px; color: var(--traffic-accent); }

.traffic-status {
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-radius: 18px;
}

.traffic-status-copy {
  margin: 0;
  color: var(--traffic-muted);
  font-size: 13px;
  line-height: 1.35;
}

.traffic-keyboard {
  color: rgba(255,255,255,.42);
  font-size: 10px;
  white-space: nowrap;
}

.traffic-complete {
  position: fixed;
  inset: 0;
  z-index: 8;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(10,12,15,.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: traffic-fade 260ms ease both;
}

.traffic-complete-card {
  width: min(100%, 430px);
  padding: 28px;
  border-radius: 28px;
  text-align: center;
  background: var(--traffic-panel-strong);
  animation: traffic-pop 420ms cubic-bezier(.2,.86,.22,1) both;
}

.traffic-complete-icon {
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  border-radius: 24px;
  color: #102419;
  background: linear-gradient(145deg, #a5f2c2, #57d991);
  box-shadow: 0 18px 36px rgba(74, 215, 139, .22);
  font-size: 36px;
  font-weight: 900;
}

.traffic-complete-title {
  margin: 0;
  font-size: 30px;
  letter-spacing: -.04em;
}

.traffic-complete-body {
  margin: 9px 0 22px;
  color: var(--traffic-muted);
  line-height: 1.45;
}

.traffic-primary {
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: 16px;
  color: #1d1b10;
  background: linear-gradient(145deg, #ffe793, var(--traffic-accent));
  font: inherit;
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(246, 211, 101, .16);
}

.traffic-app.is-busy { pointer-events: none; }

@keyframes traffic-enter {
  from { opacity: 0; transform: translateY(12px); }
}

@keyframes traffic-fade {
  from { opacity: 0; }
}

@keyframes traffic-pop {
  from { opacity: 0; transform: translateY(18px) scale(.94); }
}

@keyframes traffic-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-7px); }
  55% { transform: translateX(6px); }
  78% { transform: translateX(-3px); }
}

@keyframes traffic-blocker {
  0%, 100% { filter: brightness(1); }
  42% { filter: brightness(1.45) saturate(1.2); box-shadow: 0 0 0 5px rgba(255,128,111,.34), 0 8px 13px rgba(0,0,0,.31); }
}

@keyframes traffic-hint {
  0%, 100% { filter: brightness(1); }
  28%, 72% { filter: brightness(1.42); box-shadow: 0 0 0 5px rgba(246,211,101,.42), 0 11px 22px rgba(0,0,0,.38); }
}

@media (max-width: 620px) {
  #slop-traffic-jam { place-items: start center; }
  .traffic-app { gap: 12px; }
  .traffic-header { grid-template-columns: 1fr; align-items: start; padding: 16px; }
  .traffic-title { font-size: 34px; }
  .traffic-stats { width: 100%; grid-template-columns: repeat(3, 1fr); }
  .traffic-board-wrap { border-radius: 24px; }
  .traffic-board { border-radius: 17px; }
  .traffic-status { grid-template-columns: 1fr; min-height: 64px; }
  .traffic-keyboard { display: none; }
}

@media (max-height: 760px) and (min-width: 621px) {
  #slop-traffic-jam { place-items: start center; }
  .traffic-app { width: min(100%, 540px); gap: 10px; }
  .traffic-header { padding: 13px 16px; }
  .traffic-title { font-size: 30px; }
  .traffic-level-name { margin-top: 4px; }
  .traffic-board-wrap { width: min(100%, 440px); }
  .traffic-toolbar { padding: 8px; }
  .traffic-action { min-height: 42px; }
  .traffic-status { min-height: 48px; padding: 10px 14px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
`;
