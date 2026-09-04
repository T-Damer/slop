import type { IslandCameraMode } from '../domain/types.ts';

export const islandArt = {
  ground: 0.08,
  palette: { cream: 0xffedca, timber: 0x95644b, darkWood: 0x624638, skin: 0xf3c8a8,
    hair: 0x654330, ink: 0x393a44, blush: 0xed9b8c, sole: 0xf8edcf, leaf: 0x52934e,
    leafLight: 0x70aa57, leafAutumn: 0xd9a15a, apple: 0xee7056, pollen: 0xf4c658,
    window: 0xffdb91, path: 0xe3c998, foam: 0xd2f4dc, soil: 0x98705b },
  camera: { fov: 36, near: 0.1, far: 100, follow: 7, focusHeight: 0.65,
    portraitDistance: 1.22, elevation: 0.68, initialMode: 0 },
  render: { pixelRatio: 1.5, mobilePixelRatio: 1.15, mobileWidth: 700,
    exposure: 1.08, bloomStrength: 0.2, bloomRadius: 0.55, bloomThreshold: 1.1,
    shadowSize: 1024, shadowBias: -0.00025, normalBias: 0.035,
    sun: 0xffe6ba, sunIntensity: 2.65, skyIntensity: 2.2, groundLight: 0x929a74,
    fogNear: 28, fogFar: 62, stallSeconds: 0.25, slowFrameMs: 30, slowFrames: 80 },
  motion: { turn: 12, walkFrequency: 10, runFrequency: 15, stride: 0.5,
    bounce: 0.035, idle: 0.008, blinkPeriod: 4.7, blinkDuration: 0.12,
    shorePulse: 0.012, oceanWave: 0.8, effectSeconds: 0.7 },
  shape: { sphereSegments: 16, sphereRows: 12, cylinderSegments: 12,
    roundSegments: 2, roundRadius: 0.14, coastlineSegments: 128 },
  character: { head: [0.68, 0.64, 0.61], headY: 1.03, torso: [0.46, 0.49, 0.35],
    torsoY: 0.61, hipX: 0.12, hipY: 0.42, shoulderX: 0.27, shoulderY: 0.78,
    leg: [0.15, 0.25, 0.17], arm: [0.13, 0.31, 0.14], shoe: [0.18, 0.14, 0.27] },
  names: { leftLeg: 'left-leg', rightLeg: 'right-leg', leftArm: 'left-arm',
    rightArm: 'right-arm', eyes: 'eyes', fruit: 'fruit', planted: 'planted', shore: 'shore' },
} as const;

export const islandCameraProfiles: Record<IslandCameraMode, number> = {
  cozy: 12.6, standard: 16.5, overview: 25,
};
