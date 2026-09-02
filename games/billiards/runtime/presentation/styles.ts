export const billiardsStyles = `
#slop-billiards-root {
  position: absolute;
  inset: 0;
  overflow: auto;
  background:
    radial-gradient(circle at 50% 22%, rgba(63, 112, 146, 0.34), transparent 42%),
    linear-gradient(180deg, #102941 0%, #071522 100%);
  color: #f7f2e8;
  font-family: Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  touch-action: manipulation;
}

#slop-billiards-root * { box-sizing: border-box; }

.billiards-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: max(16px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
  overflow: auto;
}

#slop-game-shell:has(#slop-billiards-root) .slop-home-button {
  top: max(14px, env(safe-area-inset-top));
  left: max(14px, env(safe-area-inset-left));
  transform: none;
  width: 44px;
  height: 44px;
  border-radius: 14px;
}

.billiards-brand { padding-left: 54px; }

.billiards-header,
.billiards-scoreboard,
.billiards-controls {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.billiards-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.billiards-brand h1 {
  margin: 0;
  font-size: clamp(1.45rem, 3vw, 2.25rem);
  letter-spacing: -0.03em;
}

.billiards-brand p {
  margin: 3px 0 0;
  color: #aab9c5;
  font-size: 0.82rem;
}

.billiards-connection {
  flex: none;
  padding: 7px 11px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(5, 15, 24, 0.58);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.billiards-scoreboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 1.2fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
}

.billiards-player,
.billiards-status,
.billiards-control-panel {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 25, 39, 0.88);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
}

.billiards-player {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  opacity: 0.68;
  transition: opacity 180ms ease, transform 180ms ease, border-color 180ms ease;
}

.billiards-player.is-active {
  opacity: 1;
  transform: translateY(-2px);
  border-color: rgba(245, 195, 91, 0.68);
}

.billiards-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #f5c35b, #b77a1d);
  color: #28190f;
  font-weight: 1000;
}

.billiards-player-name,
.billiards-player-group { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.billiards-player-name { font-weight: 900; }
.billiards-player-group { color: #aab9c5; font-size: 0.76rem; margin-top: 2px; }

.billiards-status {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: 10px 16px;
  border-radius: 16px;
  text-align: center;
  font-size: clamp(0.85rem, 1.7vw, 1rem);
  font-weight: 850;
}

.billiards-table-wrap {
  width: min(1280px, 100%);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  display: grid;
  place-items: center;
  position: relative;
}

#slop-billiards-canvas {
  display: block;
  width: min(100%, calc((100dvh - 280px) * 16 / 9));
  height: auto;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 24px;
  filter: drop-shadow(0 24px 35px rgba(0, 0, 0, 0.42));
  user-select: none;
  touch-action: none;
  cursor: crosshair;
}

.billiards-table-hint {
  position: absolute;
  left: 50%;
  bottom: 4.5%;
  transform: translateX(-50%);
  max-width: calc(100% - 36px);
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(2, 12, 18, 0.72);
  color: rgba(255, 255, 255, 0.84);
  font-size: 0.72rem;
  font-weight: 750;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.billiards-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.billiards-control-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 14px;
  padding: 13px 15px;
  border-radius: 18px;
}

.billiards-slider {
  display: grid;
  gap: 5px;
  color: #aab9c5;
  font-size: 0.72rem;
  font-weight: 800;
}

.billiards-slider output { color: #f7f2e8; justify-self: end; }
.billiards-slider-line { display: flex; justify-content: space-between; gap: 8px; }

.billiards-slider input {
  width: 100%;
  accent-color: #f5c35b;
}

.billiards-actions {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) auto;
  gap: 9px;
}

.billiards-button {
  border: 0;
  border-radius: 17px;
  padding: 0 22px;
  min-height: 58px;
  color: #28190f;
  background: linear-gradient(180deg, #ffd779, #e5a83a);
  box-shadow: inset 0 -4px 0 rgba(92, 50, 13, 0.26), 0 10px 24px rgba(0, 0, 0, 0.2);
  font: inherit;
  font-weight: 1000;
  cursor: pointer;
}

.billiards-button.secondary {
  min-width: 58px;
  padding: 0 15px;
  color: #f7f2e8;
  background: rgba(10, 25, 39, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

.billiards-button:disabled { opacity: 0.46; cursor: not-allowed; }
.billiards-button:focus-visible, .billiards-slider input:focus-visible { outline: 3px solid #f7f2e8; outline-offset: 3px; }

.billiards-controls-copy {
  grid-column: 1 / -1;
  margin: -3px 0 0;
  color: #8294a2;
  text-align: center;
  font-size: 0.68rem;
}

@media (max-width: 820px) {
  .billiards-shell {
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    padding-left: max(10px, env(safe-area-inset-left));
    gap: 8px;
  }
  .billiards-brand p, .billiards-controls-copy { display: none; }
  .billiards-scoreboard { grid-template-columns: 1fr 1fr; }
  .billiards-status { grid-column: 1 / -1; grid-row: 2; min-height: 38px; padding: 7px 12px; }
  .billiards-player { padding: 7px 8px; grid-template-columns: 34px minmax(0, 1fr); }
  .billiards-avatar { width: 34px; height: 34px; }
  .billiards-controls { grid-template-columns: 1fr; }
  .billiards-control-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 10px; }
  .billiards-actions { grid-template-columns: 1fr auto; }
  .billiards-button { min-height: 48px; }
}

@media (max-width: 520px) {
  .billiards-shell { padding-top: 10px; padding-right: 10px; padding-bottom: 10px; }
  .billiards-brand h1 { font-size: 1.25rem; }
  .billiards-connection { padding: 5px 8px; font-size: 0.58rem; }
  .billiards-table-wrap { align-self: center; }
  #slop-billiards-canvas { border-radius: 14px; }
  .billiards-table-hint { font-size: 0.62rem; bottom: 2%; }
  .billiards-control-panel { grid-template-columns: 1fr; gap: 7px; }
  .billiards-slider { grid-template-columns: 116px minmax(0, 1fr); align-items: center; }
  .billiards-slider-line { display: block; }
  .billiards-slider output { display: none; }
}
`;
