export const parkingStyles = String.raw`
:root {
  color-scheme: light;
  font-family: "Arial Rounded MT Bold", "Trebuchet MS", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  background: #cfe5df;
}

#slop-parking-jam {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  color: #1e292a;
  background: #cfe5df;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.parking-game,
.parking-stage,
.parking-canvas-host,
.parking-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.parking-canvas {
  display: block;
  touch-action: manipulation;
  cursor: pointer;
  outline: none;
}

.parking-canvas.is-busy { cursor: default; }

.parking-hud {
  position: absolute;
  z-index: 4;
  top: max(14px, env(safe-area-inset-top));
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  pointer-events: none;
}

.parking-level {
  justify-self: start;
  min-width: 84px;
  padding: 9px 12px 8px;
  border: 2px solid rgba(25, 40, 41, .08);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 7px 0 rgba(55, 85, 77, .12), 0 13px 24px rgba(47, 75, 69, .15);
}

.parking-level-label,
.parking-score-label {
  display: block;
  color: #6d7f7d;
  font-family: system-ui, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.parking-level-value {
  display: block;
  margin-top: 1px;
  color: #1d2b2b;
  font-size: 23px;
  line-height: 1;
}

.parking-level-name {
  display: block;
  max-width: 140px;
  margin-top: 4px;
  overflow: hidden;
  color: #60716f;
  font-family: system-ui, sans-serif;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.parking-score {
  justify-self: center;
  min-width: 112px;
  padding-top: 2px;
  text-align: center;
  text-shadow: 0 2px 0 rgba(255, 255, 255, .9), 0 4px 12px rgba(34, 59, 55, .2);
}

.parking-score-value {
  display: block;
  margin-top: -1px;
  color: #203131;
  font-size: clamp(30px, 8vw, 42px);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -.04em;
}

.parking-combo {
  display: inline-block;
  min-height: 18px;
  margin-top: 4px;
  padding: 2px 8px 3px;
  border-radius: 999px;
  color: #ffffff;
  background: #e86f5b;
  box-shadow: 0 3px 0 #ba5143;
  font-family: system-ui, sans-serif;
  font-size: 11px;
  font-weight: 900;
  opacity: 0;
  transform: translateY(-3px) scale(.9);
  transition: opacity 150ms ease, transform 150ms ease;
}

.parking-combo.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.parking-coins {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 78px;
  padding: 8px 12px 8px 9px;
  border: 2px solid rgba(129, 91, 4, .12);
  border-radius: 999px;
  color: #4b3910;
  background: #f7cf58;
  box-shadow: 0 6px 0 #d1a83c, 0 12px 22px rgba(73, 67, 32, .17);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.parking-coin-icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 3px solid #fff2a8;
  border-radius: 50%;
  color: transparent;
  background: #e6aa25;
  box-shadow: inset 0 0 0 2px rgba(123, 77, 0, .18);
}

.parking-next {
  position: absolute;
  z-index: 4;
  top: max(92px, calc(env(safe-area-inset-top) + 78px));
  left: 50%;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .82);
  box-shadow: 0 4px 12px rgba(38, 65, 60, .12);
  transform: translateX(-50%);
  pointer-events: none;
}

.parking-next-label {
  margin-right: 2px;
  color: #697b79;
  font-family: system-ui, sans-serif;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.parking-next-dot {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, .78);
  border-radius: 50%;
  box-shadow: 0 2px 3px rgba(32, 48, 46, .16);
}

.parking-message {
  position: absolute;
  z-index: 5;
  left: 50%;
  bottom: max(82px, calc(env(safe-area-inset-bottom) + 68px));
  max-width: min(78vw, 430px);
  margin: 0;
  padding: 7px 12px 8px;
  border-radius: 10px;
  color: #283635;
  background: rgba(255, 255, 255, .9);
  box-shadow: 0 5px 0 rgba(60, 89, 82, .12), 0 9px 18px rgba(35, 61, 56, .12);
  font-family: system-ui, sans-serif;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.25;
  text-align: center;
  transform: translateX(-50%);
  transition: opacity 160ms ease, transform 160ms ease;
  pointer-events: none;
}

.parking-message.is-changing {
  opacity: 0;
  transform: translateX(-50%) translateY(5px);
}

.parking-controls {
  position: absolute;
  z-index: 7;
  right: max(14px, env(safe-area-inset-right));
  bottom: max(14px, env(safe-area-inset-bottom));
  display: flex;
  gap: 9px;
}

.parking-control {
  position: relative;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  padding: 0;
  border: 2px solid rgba(26, 47, 44, .08);
  border-radius: 50%;
  color: #2c3d3b;
  background: #ffffff;
  box-shadow: 0 6px 0 rgba(60, 91, 83, .18), 0 11px 20px rgba(35, 62, 56, .16);
  font: inherit;
  font-size: 23px;
  cursor: pointer;
  transition: transform 110ms ease, box-shadow 110ms ease, opacity 110ms ease;
}

.parking-control:hover:not(:disabled),
.parking-control:focus-visible:not(:disabled) {
  outline: none;
  transform: translateY(-2px);
}

.parking-control:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 2px 0 rgba(60, 91, 83, .18), 0 5px 10px rgba(35, 62, 56, .13);
}

.parking-control:disabled {
  cursor: default;
  opacity: .42;
  filter: grayscale(.65);
}

.parking-control-hint {
  color: #785a10;
  background: #f8d86d;
  box-shadow: 0 6px 0 #d4af43, 0 11px 20px rgba(71, 58, 26, .15);
}

.parking-fx {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow: hidden;
  pointer-events: none;
}

.parking-score-pop {
  position: absolute;
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 3px 0 rgba(31, 53, 49, .34), 0 6px 12px rgba(31, 53, 49, .24);
  transform: translate(-50%, -50%);
  animation: parking-score-pop 900ms cubic-bezier(.2,.8,.2,1) forwards;
}

.parking-score-pop.is-coin { color: #ffd85e; }
.parking-score-pop.is-combo { color: #ff806c; font-size: 28px; }

.parking-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(45, 67, 63, .28);
  animation: parking-overlay-in 180ms ease both;
}

.parking-result {
  width: min(100%, 350px);
  padding: 26px 24px 22px;
  border: 3px solid rgba(31, 51, 48, .08);
  border-radius: 24px;
  color: #243330;
  background: #fffdf4;
  box-shadow: 0 10px 0 rgba(52, 82, 74, .18), 0 24px 50px rgba(31, 54, 49, .24);
  text-align: center;
  animation: parking-result-in 320ms cubic-bezier(.2,.9,.25,1.15) both;
}

.parking-result-badge {
  display: grid;
  width: 70px;
  height: 70px;
  place-items: center;
  margin: -4px auto 14px;
  border-radius: 22px;
  color: #ffffff;
  background: #55bd76;
  box-shadow: 0 7px 0 #368c50;
  font-size: 36px;
}

.parking-result.is-jammed .parking-result-badge {
  background: #e86f5b;
  box-shadow: 0 7px 0 #b54d3f;
}

.parking-result-title {
  margin: 0;
  font-size: 27px;
  line-height: 1.05;
  letter-spacing: -.035em;
}

.parking-result-body {
  margin: 10px auto 18px;
  color: #687875;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
}

.parking-result-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 18px;
}

.parking-result-stat {
  padding: 9px;
  border-radius: 12px;
  background: #f1efe4;
}

.parking-result-stat strong {
  display: block;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.parking-result-stat span {
  color: #71807d;
  font-family: system-ui, sans-serif;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.parking-primary,
.parking-secondary {
  width: 100%;
  min-height: 49px;
  border: 0;
  border-radius: 14px;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}

.parking-primary {
  color: #ffffff;
  background: #3f9d61;
  box-shadow: 0 6px 0 #2e7547;
}

.parking-primary:active { transform: translateY(4px); box-shadow: 0 2px 0 #2e7547; }

.parking-secondary {
  margin-top: 10px;
  color: #41504d;
  background: #e9e8df;
  box-shadow: 0 5px 0 #c7c5bb;
}

.parking-secondary:active { transform: translateY(3px); box-shadow: 0 2px 0 #c7c5bb; }

@keyframes parking-score-pop {
  0% { opacity: 0; transform: translate(-50%, -20%) scale(.55); }
  28% { opacity: 1; transform: translate(-50%, -55%) scale(1.18); }
  100% { opacity: 0; transform: translate(-50%, -155%) scale(.92); }
}

@keyframes parking-overlay-in { from { opacity: 0; } }

@keyframes parking-result-in {
  from { opacity: 0; transform: translateY(22px) scale(.9); }
}

@media (max-width: 560px) {
  .parking-hud {
    top: max(10px, env(safe-area-inset-top));
    left: max(10px, env(safe-area-inset-left));
    right: max(10px, env(safe-area-inset-right));
  }

  .parking-level { min-width: 76px; padding: 8px 10px 7px; border-radius: 12px; }
  .parking-level-value { font-size: 20px; }
  .parking-level-name { max-width: 100px; font-size: 9px; }
  .parking-score { min-width: 88px; }
  .parking-score-value { font-size: 31px; }
  .parking-coins { min-width: 69px; padding: 7px 10px 7px 8px; font-size: 15px; }
  .parking-coin-icon { width: 19px; height: 19px; }
  .parking-next { top: max(79px, calc(env(safe-area-inset-top) + 70px)); }
  .parking-control { width: 45px; height: 45px; font-size: 21px; }
  .parking-message { bottom: max(75px, calc(env(safe-area-inset-bottom) + 61px)); }
}

@media (max-height: 690px) {
  .parking-next { display: none; }
  .parking-message { bottom: max(69px, calc(env(safe-area-inset-bottom) + 56px)); font-size: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
`;
