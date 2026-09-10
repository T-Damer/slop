export const hubStyles = `
#slop-game-shell {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #6cc7e4;
  color: #fff9e8;
  font-family: Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
}

#slop-game-shell * {
  box-sizing: border-box;
}

.slop-game-host {
  position: absolute;
  inset: 0;
}

.slop-home-button {
  position: fixed;
  z-index: 1000;
  top: 50%;
  left: max(14px, env(safe-area-inset-left));
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border: 0;
  border-radius: 17px;
  background: rgba(48, 38, 31, 0.86);
  color: #fff8e7;
  box-shadow: 0 6px 0 rgba(54, 32, 19, 0.22);
  font-size: 23px;
  cursor: pointer;
}

.slop-home-button:focus-visible {
  outline: 3px solid #fff8e7;
  outline-offset: 3px;
}

.slop-game-loading,
.slop-game-error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: #6cc7e4;
  color: #304a3a;
  font-size: 1.1rem;
  font-weight: 900;
}
`;
