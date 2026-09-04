import { personalIslandStyles } from './styles.ts';

export const islandPlayStyles = `
.personal-island{font-family:ui-rounded,system-ui,sans-serif;}
.personal-island .island-hud{padding:16px;gap:10px;}
.personal-island .island-name-card,.personal-island .island-hud-actions button{box-shadow:0 3px 0 #51644020;backdrop-filter:none;border:0;background:#fff4dce8;}
.personal-island .island-name-card{padding:10px 16px;border-radius:24px;}
.personal-island .island-name-card small{letter-spacing:.015em;color:#72745b;}
.personal-island .island-hud-actions button{min-height:46px;border-radius:22px;}
.personal-island .island-guide-tip{display:none;}
.personal-island .island-joystick-base{background:#f4ead638;border:2px solid #fff7e4b0;box-shadow:none;}
.personal-island .island-joystick-knob{background:#fff4dce8;border:0;box-shadow:0 3px 0 #51644028;}
.island-play-actions{position:absolute;z-index:8;right:max(18px,env(safe-area-inset-right));bottom:max(24px,calc(env(safe-area-inset-bottom) + 12px));display:flex;align-items:flex-end;flex-direction:column;gap:10px;max-width:calc(100% - 150px);}
.island-play-actions button{font:700 13px/1.3 system-ui,sans-serif;color:#445b45;background:#fff4dc;border:2px solid #ffffff80;border-radius:22px;min-height:48px;padding:11px 17px;box-shadow:0 3px 0 #52614530;cursor:pointer;}
.island-play-actions button:disabled{opacity:.72;cursor:default;}
.island-play-actions button[aria-pressed=true]{background:#efd297;}
.island-toast{position:absolute;z-index:12;bottom:160px;left:50%;transform:translateX(-50%);max-width:min(440px,calc(100% - 32px));padding:14px 20px;color:#445b45;background:#fff5de;border:2px solid #fff9eb;border-radius:22px;font:650 14px/1.5 system-ui,sans-serif;box-shadow:0 4px 0 #465b4125;text-align:center;pointer-events:none;}
.island-control-hint{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);font:650 11px system-ui,sans-serif;color:#fff8e5;text-shadow:0 1px 4px #344b46;pointer-events:none;}
.personal-island .island-portal-progress{bottom:160px;}
.personal-island button:focus-visible{outline:3px solid #436b59;outline-offset:4px;}
.personal-island .island-game-menu{background:#fff6e3;backdrop-filter:none;box-shadow:0 8px 28px #284b4030;}
@media(max-width:600px){
 .personal-island .island-hud{padding:10px;align-items:flex-start;}
 .personal-island .island-name-card{padding:9px 12px;min-width:0;}
 .personal-island .island-name-card>span{display:none;}
 .personal-island .island-name-card strong{font-size:13px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
 .personal-island .island-name-card small{font-size:10px;}
 .personal-island .island-hud-actions{gap:6px;}
 .personal-island .island-hud-actions button{padding:8px 10px;font-size:11px;}
 .personal-island .island-hud-actions [data-island-camera-label]{display:none;}
 .island-play-actions{right:14px;max-width:calc(100% - 136px);bottom:24px;}
 .island-play-actions button{font-size:12px;padding:10px 13px;}
 .island-control-hint{display:none;}
}
@media(prefers-reduced-motion:reduce){.personal-island *{transition:none!important;}}
`;

export function installIslandStyles(id: string): void {
  if (document.getElementById(id) !== null) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = personalIslandStyles + islandPlayStyles;
  document.head.append(style);
}
