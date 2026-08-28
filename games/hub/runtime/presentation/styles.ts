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

.slop-hub {
  position: absolute;
  inset: 0;
  overflow: auto;
  padding:
    max(28px, env(safe-area-inset-top))
    max(24px, env(safe-area-inset-right))
    max(34px, env(safe-area-inset-bottom))
    max(24px, env(safe-area-inset-left));
  background:
    radial-gradient(circle at 15% 10%, rgba(255, 238, 144, 0.55), transparent 28%),
    radial-gradient(circle at 86% 78%, rgba(39, 107, 88, 0.34), transparent 34%),
    linear-gradient(155deg, #6cc7e4 0%, #8ed5d0 48%, #e9b86b 100%);
}

.slop-hub::before,
.slop-hub::after {
  content: "";
  position: fixed;
  border-radius: 42%;
  pointer-events: none;
  opacity: 0.2;
  filter: blur(1px);
}

.slop-hub::before {
  width: 42vw;
  height: 26vw;
  left: -10vw;
  bottom: -8vw;
  background: #335b42;
  transform: rotate(8deg);
}

.slop-hub::after {
  width: 26vw;
  height: 18vw;
  right: -6vw;
  top: -5vw;
  background: #f7efbf;
  transform: rotate(-14deg);
}

.slop-hub-header {
  position: relative;
  z-index: 1;
  width: min(980px, 100%);
  margin: 0 auto;
}

.slop-hub-eyebrow {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 1000;
  letter-spacing: 0.22em;
  color: #304a3a;
}

.slop-hub h1 {
  margin: 0;
  color: #fff9e8;
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 0.94;
  letter-spacing: -0.055em;
  text-shadow: 0 7px 0 rgba(57, 76, 61, 0.18);
}

.slop-hub-subtitle {
  margin: 15px 0 0;
  max-width: 520px;
  color: rgba(42, 57, 46, 0.86);
  font-size: clamp(1rem, 2.4vw, 1.24rem);
  font-weight: 800;
}

.slop-game-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 3vw, 28px);
  width: min(980px, 100%);
  margin: clamp(30px, 7vh, 70px) auto 0;
}

.slop-game-card {
  position: relative;
  min-height: 290px;
  padding: 18px;
  overflow: hidden;
  border: 4px solid rgba(67, 53, 35, 0.22);
  border-radius: 30px;
  background: rgba(255, 248, 222, 0.94);
  box-shadow:
    0 12px 0 rgba(74, 51, 34, 0.2),
    0 22px 45px rgba(51, 62, 48, 0.2);
  color: #3d3027;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease-out, box-shadow 160ms ease-out;
}

.slop-game-card:hover,
.slop-game-card:focus-visible {
  transform: translateY(-5px) rotate(-0.4deg);
  box-shadow:
    0 16px 0 rgba(74, 51, 34, 0.19),
    0 26px 50px rgba(51, 62, 48, 0.24);
  outline: none;
}

.slop-game-art {
  position: relative;
  display: grid;
  place-items: center;
  height: 165px;
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.55), transparent 38%),
    linear-gradient(155deg, #84d4e9, #e8bb72);
}

.slop-game-art svg {
  width: min(80%, 280px);
  height: 145px;
  filter: drop-shadow(0 9px 0 rgba(57, 48, 38, 0.17));
}

.slop-game-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(48, 38, 31, 0.88);
  color: #fff8df;
  font-size: 0.68rem;
  font-weight: 1000;
  letter-spacing: 0.09em;
}

.slop-game-card h2 {
  margin: 17px 2px 4px;
  font-size: clamp(1.35rem, 3vw, 1.8rem);
  letter-spacing: -0.035em;
}

.slop-game-card p {
  margin: 0 2px;
  color: rgba(61, 48, 39, 0.74);
  font-weight: 700;
  line-height: 1.42;
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

@media (max-width: 700px) {
  .slop-hub {
    padding-top: max(22px, env(safe-area-inset-top));
  }

  .slop-game-grid {
    grid-template-columns: 1fr;
    margin-top: 28px;
  }

  .slop-game-card {
    min-height: 250px;
    border-radius: 25px;
  }

  .slop-game-art {
    height: 135px;
  }

  .slop-game-art svg {
    height: 120px;
  }
}
`;
