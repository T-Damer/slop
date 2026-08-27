export const parkingGuidanceStyles = String.raw`
.parking-next {
  top: max(88px, calc(env(safe-area-inset-top) + 74px));
  width: min(276px, calc(100vw - 176px));
  display: grid;
  gap: 5px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.parking-target-card {
  --target-color: #ffffff;
  display: grid;
  grid-template-columns: 47px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 9px;
  min-height: 60px;
  padding: 7px 10px 7px 8px;
  border: 2px solid rgba(31, 48, 46, .09);
  border-radius: 15px;
  color: #263432;
  background: #fffef8;
  box-shadow: 0 6px 0 rgba(56, 88, 79, .13), 0 11px 20px rgba(35, 62, 56, .13);
}

.parking-target-car {
  position: relative;
  display: block;
  width: 42px;
  height: 27px;
  border: 3px solid #ffffff;
  border-radius: 10px 10px 7px 7px;
  outline: 2px solid rgba(24, 38, 37, .12);
  background: var(--target-color);
  box-shadow: inset 0 -4px 0 rgba(29, 43, 41, .12), 0 3px 0 rgba(33, 52, 49, .16);
}

.parking-target-car::before {
  content: "";
  position: absolute;
  left: 9px;
  right: 9px;
  top: 4px;
  height: 8px;
  border-radius: 4px 4px 2px 2px;
  background: #31535b;
  box-shadow: inset 0 2px rgba(255,255,255,.18);
}

.parking-target-car::after {
  content: "";
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: -5px;
  height: 7px;
  border-left: 7px solid #26302f;
  border-right: 7px solid #26302f;
  border-radius: 3px;
}

.parking-target-copy {
  min-width: 0;
  text-align: left;
}

.parking-target-label {
  display: block;
  color: #70807e;
  font-family: system-ui, sans-serif;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .08em;
  line-height: 1;
  text-transform: uppercase;
}

.parking-target-name {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: #263432;
  font-size: 15px;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
}

.parking-target-group {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 7px 3px;
  border-radius: 999px;
  color: #ffffff;
  background: var(--target-color);
  box-shadow: 0 2px 0 rgba(35, 52, 49, .18);
  font-family: system-ui, sans-serif;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(30, 45, 42, .28);
}

.parking-target-arrow {
  color: var(--target-color);
  font-size: 28px;
  line-height: 1;
  text-shadow: 0 2px 0 rgba(31, 47, 45, .2);
}

.parking-queue-strip {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  min-height: 21px;
  padding: 3px 8px 4px;
  border-radius: 999px;
  background: rgba(255,255,255,.86);
  box-shadow: 0 3px 8px rgba(36, 61, 57, .1);
}

.parking-queue-label {
  margin-right: 2px;
  color: #72817f;
  font-family: system-ui, sans-serif;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}

.parking-queue-dot {
  width: 10px;
  height: 10px;
  border: 2px solid rgba(255,255,255,.9);
  border-radius: 50%;
  box-shadow: 0 2px 3px rgba(32, 48, 46, .17);
}

.parking-queue-dot.is-current-group {
  outline: 2px solid rgba(48, 65, 62, .2);
  outline-offset: 1px;
  transform: translateY(-1px);
}

.parking-queue-dot.is-first {
  width: 16px;
  height: 16px;
  outline-width: 3px;
  animation: parking-target-dot 850ms ease-in-out infinite alternate;
}

@keyframes parking-target-dot {
  from { transform: translateY(-1px) scale(.94); }
  to { transform: translateY(-1px) scale(1.08); }
}

@media (max-width: 560px) {
  .parking-next {
    top: max(73px, calc(env(safe-area-inset-top) + 66px));
    width: min(244px, calc(100vw - 152px));
  }

  .parking-target-card {
    grid-template-columns: 40px minmax(0, 1fr) 15px;
    gap: 7px;
    min-height: 54px;
    padding: 6px 8px 6px 7px;
    border-radius: 13px;
  }

  .parking-target-car {
    width: 36px;
    height: 23px;
  }

  .parking-target-name { font-size: 13px; }
  .parking-target-group { margin-top: 3px; font-size: 8px; }
  .parking-target-arrow { font-size: 24px; }
  .parking-queue-strip { min-height: 18px; padding-block: 2px 3px; }
  .parking-queue-dot { width: 8px; height: 8px; }
  .parking-queue-dot.is-first { width: 13px; height: 13px; }
}

@media (max-width: 410px) {
  .parking-next {
    width: 214px;
  }
  .parking-level-name { display: none; }
  .parking-target-name { font-size: 12px; }
}
`;
