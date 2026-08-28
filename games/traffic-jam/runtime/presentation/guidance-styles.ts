export const parkingGuidanceStyles = String.raw`
.parking-next {
  top: max(98px, calc(env(safe-area-inset-top) + 84px));
  width: min(248px, calc(100vw - 176px));
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
  grid-template-columns: 45px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 9px;
  min-height: 52px;
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
  width: 40px;
  height: 25px;
  border: 2px solid rgba(24, 38, 37, .12);
  border-radius: 9px 9px 7px 7px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.38), transparent 38%),
    var(--target-color);
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
  bottom: -4px;
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
  gap: 5px;
  min-height: 19px;
  padding: 3px 8px 4px;
  border-radius: 999px;
  background: rgba(255,255,255,.82);
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
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,.9);
  border-radius: 50%;
  box-shadow: 0 2px 3px rgba(32, 48, 46, .17);
}

.parking-queue-dot.is-first {
  width: 16px;
  height: 16px;
  outline: 2px solid rgba(48, 65, 62, .18);
  outline-offset: 1px;
}

@media (max-width: 560px) {
  .parking-next {
    top: max(82px, calc(env(safe-area-inset-top) + 75px));
    width: min(218px, calc(100vw - 158px));
  }

  .parking-target-card {
    grid-template-columns: 39px minmax(0, 1fr) 15px;
    gap: 7px;
    min-height: 47px;
    padding: 6px 8px 6px 7px;
    border-radius: 13px;
  }

  .parking-target-car {
    width: 35px;
    height: 22px;
  }

  .parking-target-name { font-size: 13px; }
  .parking-target-arrow { font-size: 24px; }
  .parking-queue-strip { min-height: 17px; padding-block: 2px 3px; }
  .parking-queue-dot { width: 10px; height: 10px; }
  .parking-queue-dot.is-first { width: 14px; height: 14px; }
}

@media (max-width: 410px) {
  .parking-next {
    width: 190px;
  }
  .parking-level-name { display: none; }
  .parking-target-name { font-size: 12px; }
}
`;
