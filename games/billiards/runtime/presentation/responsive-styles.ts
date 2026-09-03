export const billiardsResponsiveStyles = `
@media (max-width: 1080px) {
  .billiards-shell { padding-left: max(10px, env(safe-area-inset-left)); padding-right: max(10px, env(safe-area-inset-right)); }
  .billiards-stage { width: min(100%, calc((100dvh - 224px) * 16 / 9), 980px); }
  .billiards-power-control { left: 8px; }
  .billiards-angle-control { right: 8px; }
  .billiards-side-control { height: min(68%, 286px); }
}

@media (max-width: 700px), (max-height: 700px) {
  .billiards-shell { gap: 5px; padding-top: max(6px, env(safe-area-inset-top)); padding-bottom: max(6px, env(safe-area-inset-bottom)); }
  .billiards-header { min-height: 36px; }
  .billiards-brand h1 { font-size: 1.02rem; }
  .billiards-brand p,
  .billiards-controls-copy,
  .billiards-side-caption,
  .billiards-spin-copy span { display: none; }
  .billiards-connection { padding: 4px 7px; font-size: .5rem; }
  .billiards-icon-button { width: 34px; height: 34px; }
  .billiards-scoreboard { min-height: 58px; grid-template-columns: minmax(0,1fr) 112px minmax(0,1fr); border-radius: 15px; padding: 5px 9px; }
  .billiards-player { grid-template-columns: 30px minmax(0,1fr); gap: 5px; padding: 3px 5px; }
  .billiards-avatar { width: 30px; height: 30px; font-size: .7rem; }
  .billiards-player-name { font-size: .65rem; }
  .billiards-player-group { font-size: .5rem; }
  .billiards-pocketed-balls { grid-template-columns: repeat(7, minmax(9px,13px)); gap: 2px; margin-top: 2px; }
  .billiards-status { padding: 3px 5px; font-size: .57rem; }
  .billiards-stage { width: 100%; height: min(calc((100vw - 118px) * 9 / 16), calc(100dvh - 176px)); aspect-ratio: auto; }
  #slop-billiards-canvas { position: absolute; inset: 0 49px; width: calc(100% - 98px); height: 100%; border-radius: 13px; }
  .billiards-side-control { top: 0; width: 44px; height: 100%; transform: none; }
  .billiards-power-control { left: 0; }
  .billiards-angle-control { right: 0; }
  .billiards-side-control output { font-size: .66rem; }
  .billiards-side-control input { top: 21px; }
  .billiards-power-meter,
  .billiards-angle-meter { border-width: 3px; border-radius: 12px; }
  .billiards-power-track { left: 14px; right: 14px; }
  .billiards-power-fill { left: 16px; right: 16px; }
  .billiards-angle-scale { left: 16px; right: 16px; }
  .billiards-angle-indicator { width: 21px; height: 14px; }
  .billiards-table-hint { display: none; }
  .billiards-controls { grid-template-columns: minmax(0,1fr) auto; gap: 5px; }
  .billiards-spin-control { min-height: 50px; grid-template-columns: auto 45px auto; gap: 7px; padding: 2px 8px; border-radius: 13px; }
  .billiards-spin-copy strong { font-size: .61rem; }
  .billiards-spin-pad { width: 45px; height: 45px; border-width: 3px; }
  .billiards-spin-values { font-size: .53rem; gap: 1px; }
  .billiards-actions { grid-template-columns: minmax(88px,1fr) 46px; gap: 4px; }
  .billiards-button { min-height: 46px; padding: 0 12px; border-radius: 13px; font-size: .74rem; }
  .billiards-smoke-layer { opacity: .52; }
}

@media (max-width: 460px) {
  .billiards-brand { padding-left: 47px; }
  .billiards-scoreboard { grid-template-columns: 1fr 76px 1fr; }
  .billiards-player { grid-template-columns: minmax(0,1fr); }
  .billiards-avatar { display: none; }
  .billiards-pocketed-balls { grid-template-columns: repeat(7,10px); }
  .billiards-controls { grid-template-columns: minmax(0,1fr) auto; }
  .billiards-spin-copy { display: none; }
  .billiards-spin-control { grid-template-columns: 45px auto; }
  .billiards-side-control { height: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .billiards-scoreboard,
  .billiards-player.is-active,
  .billiards-ball-slot.is-pocketed,
  .billiards-smoke-wisp,
  .billiards-dust-mote { animation: none; }
  .billiards-smoke-layer { opacity: .24; }
  * { scroll-behavior: auto !important; }
}
`;
