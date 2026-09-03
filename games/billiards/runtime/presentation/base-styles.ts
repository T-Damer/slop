export const billiardsBaseStyles = `
#slop-billiards-root {
  --billiards-power-percent: 68%;
  --billiards-angle-position: 50%;
  --billiards-spin-left: 50%;
  --billiards-spin-top: 50%;
  --old-brass: #b98a45;
  --bright-brass: #ddbf78;
  --dark-brass: #5b3515;
  --old-wood: #5a2d17;
  --dark-wood: #1d0d08;
  --old-leather: #3b1c13;
  --oxblood: #4b171b;
  --ivory: #eee1c8;
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
  color: var(--ivory);
  background: #090604;
  font-family: Georgia, "Palatino Linotype", "Book Antiqua", serif;
  touch-action: manipulation;
}

#slop-billiards-root *,
#slop-billiards-root *::before,
#slop-billiards-root *::after { box-sizing: border-box; }

.billiards-room-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    radial-gradient(circle at 50% 42%, rgba(180, 112, 48, 0.08), transparent 44%),
    linear-gradient(180deg, rgba(8, 5, 3, 0.06), rgba(4, 2, 2, 0.42)),
    var(--billiards-room-art);
  background-position: center;
  background-size: cover;
  filter: saturate(0.78) sepia(0.12) contrast(1.08) brightness(0.72);
  transform: scale(1.015);
}

.billiards-room-backdrop::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(102deg, rgba(255,255,255,.012) 0 1px, transparent 1px 7px),
    radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(0,0,0,.72) 100%);
  opacity: .82;
  pointer-events: none;
}

.billiards-shell {
  position: relative;
  z-index: 5;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 8px;
  padding:
    max(9px, env(safe-area-inset-top))
    max(82px, env(safe-area-inset-right))
    max(9px, env(safe-area-inset-bottom))
    max(82px, env(safe-area-inset-left));
  overflow: hidden;
}

#slop-game-shell:has(#slop-billiards-root) .slop-home-button {
  top: max(10px, env(safe-area-inset-top));
  left: max(10px, env(safe-area-inset-left));
  width: 44px;
  height: 44px;
  z-index: 20;
  transform: none;
  border: 2px solid rgba(211, 174, 105, .56);
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 25%, rgba(255,255,255,.18), transparent 19%),
    linear-gradient(145deg, #69401f, #1a0b06 72%);
  box-shadow: inset 0 0 0 3px rgba(0,0,0,.48), 0 5px 16px rgba(0,0,0,.58);
}

.billiards-header,
.billiards-scoreboard,
.billiards-controls {
  width: min(1160px, 100%);
  margin: 0 auto;
}

.billiards-header {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.billiards-brand { min-width: 0; }
.billiards-brand h1 {
  margin: 0;
  color: #e7d5b5;
  font-size: clamp(1.12rem, 2.35vw, 1.72rem);
  font-weight: 700;
  letter-spacing: .035em;
  text-shadow: 0 2px 0 #1d0d08, 0 0 18px rgba(183, 127, 57, .18);
}
.billiards-brand p {
  margin: 1px 0 0;
  color: #a78d6e;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .66rem;
  letter-spacing: .035em;
}

.billiards-utilities { display: flex; align-items: center; gap: 7px; }
.billiards-connection,
.billiards-icon-button {
  border: 1px solid rgba(205, 159, 88, .36);
  background:
    repeating-radial-gradient(circle at 20% 15%, rgba(255,255,255,.025) 0 1px, transparent 1px 4px),
    linear-gradient(180deg, #4a2a1b, #170b08 68%, #080504);
  box-shadow: inset 0 1px rgba(255,255,255,.08), inset 0 -2px 5px rgba(0,0,0,.65), 0 5px 16px rgba(0,0,0,.42);
}
.billiards-connection {
  padding: 6px 10px;
  border-radius: 999px;
  color: #d2b789;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .57rem;
  font-weight: 850;
  letter-spacing: .12em;
}
.billiards-icon-button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;
  color: #ecd7ad;
  font-size: 1.02rem;
  cursor: pointer;
}
.billiards-icon-button[aria-pressed="true"] { color: #7c6d5a; filter: saturate(.4); }

`;
