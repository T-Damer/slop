export const billiardsAtmosphereStyles = `
.billiards-smoke-layer {
  position: absolute;
  inset: 0;
  z-index: 8;
  overflow: hidden;
  pointer-events: none;
  opacity: .78;
  mix-blend-mode: screen;
  mask-image: radial-gradient(ellipse at 50% 48%, rgba(0,0,0,.82), rgba(0,0,0,.35) 58%, transparent 94%);
}
.billiards-smoke-wisp {
  position: absolute;
  display: block;
  width: clamp(150px, 24vw, 340px);
  height: clamp(55px, 9vw, 120px);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 32% 45%, rgba(223,215,199,.13), transparent 44%),
    radial-gradient(ellipse at 68% 55%, rgba(187,182,174,.09), transparent 49%);
  filter: blur(15px);
  opacity: .34;
  transform-origin: center;
  animation: billiards-smoke-drift 18s ease-in-out infinite alternate;
}
.smoke-a { left: -5%; top: 24%; animation-duration: 22s; }
.smoke-b { left: 24%; top: 39%; width: 30vw; animation-delay: -8s; animation-duration: 27s; }
.smoke-c { right: -7%; top: 17%; animation-delay: -13s; animation-duration: 25s; }
.smoke-d { right: 12%; bottom: 17%; width: 25vw; animation-delay: -4s; animation-duration: 21s; }
.smoke-e { left: 3%; bottom: 7%; width: 19vw; animation-delay: -17s; animation-duration: 29s; }
.billiards-dust-mote {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(235, 205, 150, .45);
  box-shadow: 0 0 5px rgba(234, 188, 112, .38);
  animation: billiards-dust-float 11s linear infinite;
}
.dust-a { left: 13%; top: 31%; animation-delay: -2s; }
.dust-b { left: 37%; top: 18%; animation-delay: -6s; animation-duration: 14s; }
.dust-c { left: 58%; top: 44%; animation-delay: -8s; animation-duration: 13s; }
.dust-d { left: 81%; top: 26%; animation-delay: -4s; animation-duration: 16s; }
.dust-e { left: 24%; top: 69%; animation-delay: -9s; animation-duration: 15s; }
.dust-f { left: 72%; top: 73%; animation-delay: -1s; animation-duration: 12s; }

@keyframes billiards-hud-enter { from { opacity: 0; transform: translateY(-8px); } }
@keyframes billiards-active-player { 50% { box-shadow: inset 0 0 22px rgba(198,142,61,.13), 0 0 21px rgba(173,119,48,.19); } }
@keyframes billiards-ball-pocketed { from { opacity: 0; transform: scale(.25) rotate(-24deg); } to { opacity: 1; transform: scale(1); } }
@keyframes billiards-smoke-drift {
  0% { transform: translate3d(-6%, 5%, 0) scale(.82) rotate(-4deg); opacity: .16; }
  42% { transform: translate3d(14%, -4%, 0) scale(1.08) rotate(3deg); opacity: .34; }
  100% { transform: translate3d(30%, -12%, 0) scale(1.28) rotate(-2deg); opacity: .12; }
}
@keyframes billiards-dust-float {
  0% { transform: translate3d(0, 18px, 0) scale(.7); opacity: 0; }
  18% { opacity: .55; }
  72% { opacity: .3; }
  100% { transform: translate3d(30px, -90px, 0) scale(1.3); opacity: 0; }
}
`;
