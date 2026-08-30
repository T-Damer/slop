export const personalIslandStyles = String.raw`
:root{color-scheme:light;font-family:ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif;}
#slop-personal-island-root,#slop-personal-island-root *{box-sizing:border-box;}
#slop-personal-island-root{position:absolute;inset:0;z-index:20;overflow:hidden;color:#29403f;background:#9fdcf0;-webkit-tap-highlight-color:transparent;}
.island-loading,.island-onboarding{position:absolute;inset:0;display:grid;place-items:center;min-height:100%;padding:max(20px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:radial-gradient(circle at 14% 12%,rgba(255,255,255,.6),transparent 24%),radial-gradient(circle at 86% 84%,rgba(255,234,166,.5),transparent 28%),linear-gradient(160deg,#9fdcf0,#bcebd8 54%,#f3dca0);}
.island-loading{align-content:center;gap:12px;font-size:18px;}
.island-loading span{font-size:54px;animation:island-float 1.8s ease-in-out infinite;}
.island-guide-card,.island-preference-card,.island-generation-card{width:min(100%,590px);padding:clamp(22px,5vw,38px);border:3px solid rgba(58,92,84,.09);border-radius:34px;background:rgba(255,253,244,.96);box-shadow:0 15px 0 rgba(72,116,97,.12),0 35px 80px rgba(48,84,82,.24);text-align:center;animation:island-card-in 380ms cubic-bezier(.2,.85,.25,1.12) both;}
.island-guide-avatar{display:grid;width:112px;height:112px;place-items:center;margin:-78px auto 16px;border:8px solid #fffdf4;border-radius:44% 56% 48% 52%;color:#fff;background:linear-gradient(145deg,#f9ca5b,#f19555);box-shadow:0 10px 0 rgba(166,103,48,.2);transform:rotate(-3deg);}
.island-guide-face{display:grid;width:66px;height:66px;place-items:center;border-radius:46% 54% 48% 52%;color:#7a5d31;background:#fff0bd;font-size:34px;}
.island-guide-name{margin:0 0 8px;color:#6d8b80;font-family:system-ui,sans-serif;font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;}
.island-guide-card h1,.island-preference-card h1,.island-generation-card h1{margin:0 0 12px;color:#2f4b47;font-size:clamp(28px,7vw,46px);line-height:1.02;letter-spacing:-.04em;}
.island-guide-card p,.island-question-subtitle,.island-generation-card p{margin:8px auto;color:#668079;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;line-height:1.5;}
.island-primary-button,.island-secondary-button{min-height:50px;padding:0 22px;border:0;border-radius:16px;font:inherit;font-size:15px;font-weight:850;cursor:pointer;transition:transform 120ms ease,box-shadow 120ms ease;}
.island-primary-button{margin-top:22px;color:#fff;background:#57aa72;box-shadow:0 7px 0 #3d7e55;}
.island-secondary-button{color:#536b66;background:#e9eee6;box-shadow:0 6px 0 #cfd8ce;}
.island-primary-button:active,.island-secondary-button:active{transform:translateY(5px);box-shadow:0 2px 0 rgba(53,91,69,.4);}
.island-wizard-progress,.island-generation-track{height:10px;overflow:hidden;margin-bottom:24px;border-radius:999px;background:#e6ede4;}
.island-wizard-progress span,.island-generation-track span{display:block;width:calc(var(--island-progress) * 100%);height:100%;border-radius:inherit;background:linear-gradient(90deg,#66bc82,#8ad19f);transition:width 260ms ease;}
.island-chip-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:23px;}
.island-chip{min-height:58px;padding:10px 13px;border:2px solid #e0e7dd;border-radius:17px;color:#425c57;background:#fafbf5;font:inherit;font-size:14px;font-weight:800;cursor:pointer;transition:transform 140ms ease,border-color 140ms ease,background 140ms ease;}
.island-chip span{display:inline-block;margin-right:7px;font-size:22px;vertical-align:middle;}
.island-chip.is-selected{border-color:#5fb77b;background:#e4f5e8;transform:translateY(-2px);box-shadow:0 5px 0 rgba(72,139,93,.18);}
.island-wizard-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:12px;margin-top:22px;}
.island-wizard-actions .island-primary-button{margin-top:0;}
.island-generation-orbit{display:grid;width:112px;height:112px;place-items:center;margin:-8px auto 16px;border:4px dashed rgba(73,151,105,.32);border-radius:50%;animation:island-spin 5s linear infinite;}
.island-generation-orbit span{font-size:56px;animation:island-counter-spin 5s linear infinite,island-float 1.5s ease-in-out infinite;}
.island-generation-active{min-height:24px;color:#4d9666 !important;font-size:16px !important;font-weight:850 !important;}
.island-generation-list{display:grid;gap:7px;margin:20px 0 0;padding:0;list-style:none;text-align:left;}
.island-generation-list li{padding:8px 11px;border-radius:12px;color:#91a39d;background:#f2f4ee;font-family:system-ui,sans-serif;font-size:13px;font-weight:700;transition:color 180ms ease,background 180ms ease;}
.island-generation-list li span{margin-right:8px;}
.island-generation-list li.is-complete{color:#3c7450;background:#e4f4e7;}
.personal-island,.island-canvas-host,.island-canvas{position:absolute;inset:0;width:100%;height:100%;}
.personal-island{overflow:hidden;background:#8dd5eb;}
.island-canvas{display:block;touch-action:none;}
.island-hud{position:absolute;z-index:5;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));display:flex;align-items:flex-start;justify-content:space-between;gap:12px;pointer-events:none;}
.island-name-card,.island-hud-actions button,.island-guide-tip,.island-game-menu{border:2px solid rgba(54,91,81,.08);background:rgba(255,253,244,.94);box-shadow:0 7px 0 rgba(68,104,92,.14),0 13px 24px rgba(48,80,77,.16);backdrop-filter:blur(9px);}
.island-name-card{display:flex;align-items:center;gap:9px;max-width:250px;padding:9px 12px;border-radius:17px;}
.island-name-card > span{font-size:27px;}
.island-name-card strong,.island-name-card small{display:block;}
.island-name-card strong{overflow:hidden;color:#2c4742;font-size:14px;text-overflow:ellipsis;white-space:nowrap;}
.island-name-card small{margin-top:2px;color:#80938e;font-family:system-ui,sans-serif;font-size:9px;}
.island-hud-actions{display:flex;gap:8px;pointer-events:auto;}
.island-hud-actions button{min-width:48px;min-height:46px;padding:0 12px;border-radius:15px;color:#3d5954;font:inherit;font-size:12px;font-weight:850;cursor:pointer;}
.island-guide-tip{position:absolute;z-index:5;left:50%;bottom:max(20px,calc(env(safe-area-inset-bottom) + 10px));display:flex;max-width:min(76vw,470px);align-items:center;gap:9px;padding:9px 14px;border-radius:16px;transform:translateX(-50%);pointer-events:none;}
.island-guide-tip > span{font-size:24px;}
.island-guide-tip p{margin:0;color:#56706a;font-family:system-ui,sans-serif;font-size:11px;font-weight:650;line-height:1.3;}
.island-guide-tip strong{margin-right:5px;color:#d3873f;}
.island-joystick-base{position:absolute;z-index:8;left:max(18px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 8px));width:112px;height:112px;border:4px solid rgba(255,255,255,.6);border-radius:50%;background:rgba(61,92,87,.2);box-shadow:inset 0 0 0 2px rgba(58,91,84,.1);touch-action:none;}
.island-joystick-knob{position:absolute;top:50%;left:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border:3px solid rgba(62,91,83,.09);border-radius:50%;background:rgba(255,253,244,.94);box-shadow:0 5px 0 rgba(64,96,87,.2);}
.island-portal-progress{--portal-progress:0;position:absolute;z-index:7;top:50%;left:50%;display:grid;min-width:190px;place-items:center;gap:8px;padding:13px 18px;border-radius:20px;color:#fff;background:rgba(37,60,58,.76);opacity:0;transform:translate(-50%,-50%) scale(.9);pointer-events:none;transition:opacity 120ms ease,transform 120ms ease;}
.island-portal-progress.is-visible{opacity:1;transform:translate(-50%,-50%) scale(1);}
.island-portal-progress span{width:80px;height:8px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.22);}
.island-portal-progress span::after{content:"";display:block;width:calc(var(--portal-progress) * 100%);height:100%;border-radius:inherit;background:#ffe27b;}
.island-portal-progress strong{font-family:system-ui,sans-serif;font-size:12px;}
.island-game-menu{position:absolute;z-index:30;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:min(380px,calc(100% - 24px));max-height:calc(100% - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:auto;padding:18px;border-radius:26px;opacity:0;transform:translateX(calc(100% + 30px));pointer-events:none;transition:opacity 220ms ease,transform 300ms cubic-bezier(.2,.85,.2,1);}
.island-game-menu.is-open{opacity:1;transform:translateX(0);pointer-events:auto;}
.island-menu-header{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.island-menu-header small{color:#7c918b;font-family:system-ui,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;}
.island-menu-header h2{margin:2px 0 0;font-size:25px;}
.island-menu-header button{width:44px;height:44px;border:0;border-radius:50%;color:#536d67;background:#e9eee7;font-size:27px;cursor:pointer;}
.island-menu-grid{display:grid;gap:10px;margin-top:16px;}
.island-game-card{display:flex;min-height:78px;align-items:center;gap:12px;padding:12px;border:2px solid #e2e9df;border-radius:18px;color:#334f49;background:#fbfcf6;text-align:left;cursor:pointer;}
.island-game-card > span{display:grid;width:52px;height:52px;flex:0 0 auto;place-items:center;border-radius:16px;background:#e6f3e7;font-size:28px;}
.island-game-card strong,.island-game-card small{display:block;}
.island-game-card strong{font-size:15px;}
.island-game-card small{margin-top:4px;color:#758984;font-family:system-ui,sans-serif;font-size:11px;line-height:1.25;}
.island-regenerate{width:100%;min-height:46px;margin-top:14px;border:0;border-radius:14px;color:#7a6033;background:#f7e7b5;font:inherit;font-size:12px;font-weight:850;cursor:pointer;}
@keyframes island-card-in{from{opacity:0;transform:translateY(20px) scale(.94);}
}
@keyframes island-float{0%,100%{transform:translateY(0);}
50%{transform:translateY(-8px);}
}
@keyframes island-spin{to{transform:rotate(360deg);}
}
@keyframes island-counter-spin{to{transform:rotate(-360deg);}
}
@media (max-width:620px){.island-guide-card,.island-preference-card,.island-generation-card{padding:24px 18px;border-radius:27px;}
.island-guide-avatar{width:92px;height:92px;margin-top:-65px;}
.island-chip-grid{grid-template-columns:1fr;}
.island-hud{align-items:flex-start;}
.island-name-card{max-width:158px;}
.island-name-card small{display:none;}
.island-hud-actions button span{display:none;}
.island-guide-tip{bottom:max(22px,calc(env(safe-area-inset-bottom) + 12px));}
.island-joystick-base{width:98px;height:98px;}
}
@media (max-height:660px){.island-guide-card,.island-preference-card,.island-generation-card{transform:scale(.9);}
.island-guide-tip{display:none;}
.island-generation-list{grid-template-columns:1fr 1fr;}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms !important;transition-duration:1ms !important;}
}
`;
