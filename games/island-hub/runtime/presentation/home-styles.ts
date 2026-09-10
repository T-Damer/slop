export const islandHomeStyles = `
.island-location{position:absolute;z-index:9;top:86px;left:18px;color:#546553;background:#fff4dc;padding:8px 14px;border-radius:16px;font:700 13px system-ui;pointer-events:none}
#slop-personal-island-root.island-transitioning .island-canvas-host{animation:island-door-fade .45s ease-out}
@keyframes island-door-fade{from{opacity:.15}to{opacity:1}}
.home-editor,.island-sound-panel{position:absolute;z-index:22;padding:16px;background:#fff4dc;color:#405846;border:2px solid #fffaf0;border-radius:20px;box-shadow:0 5px 0 #3c4c4120;font:13px/1.4 system-ui}
.home-editor{right:12px;bottom:18px;width:270px;display:grid;gap:9px}
.home-editor strong{font-size:17px}.home-editor small{color:#6b7866}.home-editor p{margin:0;min-height:36px;font-size:12px}
.home-editor select{min-height:44px;width:100%;border:1px solid #b7b8a0;border-radius:10px;background:#fffaf0;color:#405846;padding:8px;font:inherit}
.home-editor button{min-height:44px;border:1px solid #b7b8a0;border-radius:12px;background:#f6e9cb;color:#405846;padding:7px;font:650 12px system-ui;cursor:pointer}
.home-editor button:disabled{opacity:.45;cursor:default}.home-editor button:focus-visible,.home-editor select:focus-visible{outline:3px solid #6a8369;outline-offset:2px}
.home-editor-arrows{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.home-editor-arrows button{font-size:21px}
.home-editor-tools,.home-editor-confirm{display:grid;grid-template-columns:1fr 1fr;gap:6px}.home-editor-confirm button:first-child{background:#7f9f7b;color:white}
.personal-island.is-editing .island-canvas-host{right:292px;width:auto}.personal-island.is-editing .island-joystick-base,.personal-island.is-editing .island-play-actions,.personal-island.is-editing .island-control-hint{display:none}
.personal-island.is-editing .island-hud-actions{visibility:hidden}
.island-sound-panel{top:74px;right:16px;width:250px;z-index:28}.island-sound-panel label{display:grid;grid-template-columns:90px 1fr;align-items:center;min-height:44px;gap:5px}.island-sound-panel input{width:100%;min-height:44px;accent-color:#7f9f7b}.island-sound-panel small{display:block;color:#75816e}
#slop-personal-island-root [hidden]{display:none!important}
@media(max-width:700px){.home-editor{left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));width:auto;gap:5px;padding:10px;grid-template-columns:1fr 1fr}.home-editor strong{font-size:14px}.home-editor small{display:none}.home-editor select,.home-editor p{grid-column:1/-1}.home-editor p{min-height:28px}.home-editor-tools{grid-template-columns:1fr 1fr}.home-editor-confirm{grid-column:1/-1}.home-editor-arrows{grid-template-columns:1fr 1fr}.personal-island.is-editing .island-canvas-host{right:0;bottom:284px;height:auto;width:100%}.island-location{top:75px;left:12px}.personal-island .island-hud-actions{gap:4px}.personal-island .island-hud-actions button{padding:8px;min-width:44px}.island-sound-panel{right:10px;top:68px}}
@media(prefers-reduced-motion:reduce){#slop-personal-island-root.island-transitioning .island-canvas-host{animation:none}}
`;
