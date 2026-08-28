import type { HubGameCard } from './registry.ts';

export function renderHubIcon(icon: HubGameCard['icon']): string {
  return icon === 'junkyard' ? junkyardIcon : parkingIcon;
}

const junkyardIcon = `
<svg viewBox="0 0 320 170" role="img" aria-label="Junkyard station">
  <ellipse cx="164" cy="145" rx="126" ry="18" fill="#9b7047"/>
  <g transform="translate(45 25)">
    <rect x="30" y="57" width="54" height="78" rx="10" fill="#c94439"/>
    <rect x="37" y="67" width="40" height="24" rx="5" fill="#f7efd8"/>
    <rect x="47" y="74" width="20" height="11" rx="2" fill="#315363"/>
    <rect x="43" y="99" width="28" height="20" rx="3" fill="#f2c34d"/>
    <path d="M84 78 C108 85, 98 119, 123 122" fill="none" stroke="#333b3c" stroke-width="7" stroke-linecap="round"/>
    <circle cx="126" cy="122" r="8" fill="#333b3c"/>
  </g>
  <g transform="translate(132 56)">
    <rect x="10" y="40" width="123" height="43" rx="17" fill="#4fb76c"/>
    <rect x="35" y="18" width="72" height="38" rx="14" fill="#f5eddd"/>
    <path d="M44 24 h54 l12 27 h-78z" fill="#6ca5bf"/>
    <circle cx="35" cy="88" r="16" fill="#27292b"/>
    <circle cx="112" cy="88" r="16" fill="#27292b"/>
    <circle cx="35" cy="88" r="7" fill="#b9b2a7"/>
    <circle cx="112" cy="88" r="7" fill="#b9b2a7"/>
  </g>
  <g transform="translate(196 15)">
    <circle cx="30" cy="34" r="18" fill="#f2b27c"/>
    <path d="M13 31 q18-24 38 0" fill="#27517b"/>
    <rect x="13" y="50" width="35" height="42" rx="12" fill="#e64f3d"/>
    <rect x="18" y="61" width="25" height="32" rx="8" fill="#2e87c7"/>
    <path d="M16 59 l-11 35 M46 59 l14 32" stroke="#f2b27c" stroke-width="9" stroke-linecap="round"/>
    <path d="M23 91 l-8 35 M39 91 l9 35" stroke="#384555" stroke-width="10" stroke-linecap="round"/>
  </g>
</svg>`;

const parkingIcon = `
<svg viewBox="0 0 320 170" role="img" aria-label="Parking jam">
  <rect x="30" y="22" width="260" height="126" rx="28" fill="#63666b"/>
  <path d="M73 29 v112 M117 29 v112 M161 29 v112 M205 29 v112 M249 29 v112" stroke="#f5e7a9" stroke-width="3" stroke-dasharray="10 9" opacity=".65"/>
  <g transform="translate(53 40) rotate(-4 28 43)">
    <rect width="52" height="83" rx="18" fill="#ef6656"/>
    <rect x="8" y="15" width="36" height="22" rx="7" fill="#9ed2e4"/>
    <circle cx="7" cy="20" r="6" fill="#24272b"/>
    <circle cx="45" cy="63" r="6" fill="#24272b"/>
  </g>
  <g transform="translate(132 68) rotate(90 28 43)">
    <rect width="52" height="83" rx="18" fill="#f1bd45"/>
    <rect x="8" y="15" width="36" height="22" rx="7" fill="#9ed2e4"/>
    <circle cx="7" cy="20" r="6" fill="#24272b"/>
    <circle cx="45" cy="63" r="6" fill="#24272b"/>
  </g>
  <g transform="translate(215 35) rotate(5 28 43)">
    <rect width="52" height="83" rx="18" fill="#54b889"/>
    <rect x="8" y="15" width="36" height="22" rx="7" fill="#9ed2e4"/>
    <circle cx="7" cy="20" r="6" fill="#24272b"/>
    <circle cx="45" cy="63" r="6" fill="#24272b"/>
  </g>
</svg>`;
