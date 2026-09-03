export const billiardsControlStyles = `
.billiards-side-control {
  position: absolute;
  top: 50%;
  z-index: 6;
  width: 58px;
  height: min(72%, 330px);
  display: grid;
  grid-template-rows: auto auto minmax(0,1fr);
  gap: 3px;
  transform: translateY(-50%);
  color: #d9ba71;
  text-align: center;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .6rem;
  font-weight: 850;
  filter: drop-shadow(0 7px 12px rgba(0,0,0,.72));
}
.billiards-power-control { left: -70px; }
.billiards-angle-control { right: -70px; }
.billiards-side-control output { font-size: .82rem; text-shadow: 0 2px 5px #000; }
.billiards-side-caption { color: #bda585; font-size: .51rem; text-transform: uppercase; letter-spacing: .09em; }
.billiards-side-control input {
  position: absolute;
  inset: 34px 0 0;
  width: 100%;
  height: calc(100% - 34px);
  opacity: .001;
  writing-mode: vertical-lr;
  direction: rtl;
  cursor: ns-resize;
  touch-action: none;
}
.billiards-power-meter,
.billiards-angle-meter {
  grid-row: 3;
  width: 100%;
  min-width: 0;
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 4px solid #090706;
  border-radius: 15px;
  background:
    repeating-linear-gradient(180deg, rgba(207,176,121,.12) 0 1px, transparent 1px 12.5%),
    repeating-radial-gradient(circle at 19% 17%, rgba(255,255,255,.025) 0 1px, transparent 1px 4px),
    linear-gradient(90deg, #3b2116, #170c08 43%, #2d1710 68%, #0b0705);
  box-shadow: inset 0 0 0 2px #6c4a27, inset 0 0 15px #000, 0 0 0 1px rgba(184,137,64,.3);
}
.billiards-power-track {
  position: absolute;
  inset: 9px 18px;
  border: 1px solid rgba(224, 194, 135, .22);
  border-radius: 7px;
  background: linear-gradient(90deg, #100b08, #44311f 48%, #100b08);
  box-shadow: inset 0 0 8px #000;
}
.billiards-power-fill {
  position: absolute;
  inset: auto 20px 10px;
  height: calc(var(--billiards-power-percent) - 10px);
  border-radius: 5px;
  background: linear-gradient(180deg, #d8c778, #b77926 56%, #733013);
  box-shadow: 0 0 8px rgba(190,128,37,.32), inset 1px 0 rgba(255,255,255,.24);
  transition: height 80ms linear;
}
.billiards-power-cue {
  position: absolute;
  left: 50%;
  bottom: 11px;
  width: 12px;
  height: calc(100% - 22px);
  transform: translateX(-50%);
  border-radius: 8px;
  background:
    repeating-linear-gradient(180deg, transparent 0 24px, rgba(37,15,8,.4) 24px 27px),
    linear-gradient(90deg, #27120b 0 15%, #875026 27%, #d7b176 49%, #8e4e25 76%, #231009 100%);
  box-shadow: 0 0 0 1px rgba(0,0,0,.76), inset 2px 0 rgba(255,255,255,.18);
}
.billiards-power-tip {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: var(--billiards-power-percent);
  height: 4px;
  border-radius: 3px;
  background: #d7e5e9;
  box-shadow: 0 0 5px rgba(225,241,244,.62), 0 0 0 2px #17120f;
  transition: bottom 80ms linear;
}
.billiards-angle-scale {
  position: absolute;
  inset: 8px 23px;
  border: 1px solid rgba(213,180,121,.18);
  border-radius: 6px;
  background:
    repeating-linear-gradient(180deg, transparent 0 10%, rgba(213,190,149,.28) 10% 10.7%),
    linear-gradient(90deg, #090807, #6f6555 49%, #17130f);
  box-shadow: inset 0 0 8px #000;
}
.billiards-angle-indicator {
  position: absolute;
  z-index: 1;
  top: var(--billiards-angle-position);
  left: 3px;
  width: 28px;
  height: 18px;
  transform: translateY(-50%);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  background: linear-gradient(90deg, #8e1e14, #cf8a3b);
  filter: drop-shadow(0 0 3px rgba(190,84,34,.72));
  transition: top 70ms linear;
}

.billiards-controls { display: grid; grid-template-columns: minmax(260px,1fr) auto; align-items: center; gap: 9px; }
.billiards-spin-control {
  min-width: 0;
  min-height: 68px;
  display: grid;
  grid-template-columns: minmax(110px,auto) 62px minmax(85px,auto);
  align-items: center;
  justify-content: center;
  gap: 13px;
  padding: 5px 14px;
  border: 1px solid rgba(189,143,73,.36);
  border-radius: 17px;
  background:
    repeating-radial-gradient(circle at 15% 20%, rgba(255,255,255,.025) 0 1px, transparent 1px 4px),
    linear-gradient(180deg, #4a281b, #170b08 70%, #090504);
  box-shadow: inset 0 1px rgba(255,255,255,.07), inset 0 -3px 7px rgba(0,0,0,.6), 0 8px 20px rgba(0,0,0,.4);
}
.billiards-spin-control::before {
  content: "";
  position: absolute;
  pointer-events: none;
}
.billiards-spin-copy { display: grid; gap: 2px; }
.billiards-spin-copy strong { color: #d7b76d; font-size: .76rem; }
.billiards-spin-copy span { color: #a99172; font-family: ui-sans-serif, system-ui, sans-serif; font-size: .56rem; }
.billiards-spin-pad {
  position: relative;
  width: 62px;
  height: 62px;
  border: 4px solid #15100d;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 25%, rgba(255,255,255,.72) 0 8%, transparent 9%),
    radial-gradient(circle at 38% 32%, #f2eee2, #c7c1b3 52%, #65625d 100%);
  box-shadow: 0 0 0 2px #775631, inset -9px -11px 16px rgba(0,0,0,.34), inset 7px 6px 9px rgba(255,255,255,.46);
  cursor: crosshair;
  touch-action: none;
}
.billiards-spin-crosshair::before,
.billiards-spin-crosshair::after {
  content: "";
  position: absolute;
  inset: 50% 12%;
  height: 1px;
  background: rgba(40,32,27,.28);
}
.billiards-spin-crosshair::after { transform: rotate(90deg); }
.billiards-spin-dot {
  position: absolute;
  left: var(--billiards-spin-left);
  top: var(--billiards-spin-top);
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border: 2px solid #e7dcc8;
  border-radius: 50%;
  background: #8f2018;
  box-shadow: 0 1px 4px #000, 0 0 5px rgba(142,48,26,.55);
  transition: left 70ms linear, top 70ms linear;
}
.billiards-spin-values { display: grid; gap: 4px; color: #cbb18b; font-family: ui-sans-serif, system-ui, sans-serif; font-size: .63rem; font-weight: 800; }
.billiards-hidden-control { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.billiards-actions { display: grid; grid-template-columns: minmax(116px,1fr) 52px; gap: 7px; }
.billiards-button {
  min-height: 52px;
  padding: 0 20px;
  border: 1px solid #caa25d;
  border-radius: 15px;
  color: #e8d4ad;
  background:
    repeating-radial-gradient(circle at 18% 16%, rgba(255,255,255,.025) 0 1px, transparent 1px 4px),
    linear-gradient(180deg, #704325, #3d1e12 58%, #1b0c08);
  box-shadow: inset 0 1px rgba(255,255,255,.12), inset 0 -4px rgba(0,0,0,.32), 0 8px 18px rgba(0,0,0,.42);
  font: inherit;
  font-weight: 700;
  letter-spacing: .03em;
  cursor: pointer;
}
.billiards-button.secondary { min-width: 52px; padding: 0; color: #d9c6a2; background: linear-gradient(180deg, #38302a, #100d0b); border-color: rgba(190,151,84,.38); }
.billiards-button:disabled { opacity: .46; cursor: not-allowed; }
.billiards-button:focus-visible,
.billiards-icon-button:focus-visible,
.billiards-spin-pad:focus-visible,
.billiards-side-control input:focus-visible { outline: 3px solid #e2c98f; outline-offset: 3px; }
.billiards-controls-copy { grid-column: 1 / -1; margin: -4px 0 0; color: #8f7b64; text-align: center; font-family: ui-sans-serif, system-ui, sans-serif; font-size: .55rem; }
`;
