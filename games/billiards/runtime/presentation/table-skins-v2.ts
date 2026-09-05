export interface BilliardsRoomLightV2 {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly ambient: number;
  readonly diffuse: number;
  readonly specular: number;
  readonly warmth: number;
}

export interface BilliardsCueSkinV2 {
  readonly id: string;
  readonly tip: string;
}

export interface BilliardsTableSkinV2 {
  readonly id: string;
  readonly felt: string;
  readonly feltDark: string;
  readonly rail: string;
  readonly railDark: string;
  readonly pocket: string;
  readonly light: BilliardsRoomLightV2;
  readonly cue: BilliardsCueSkinV2;
}

export const classicPocketClubSkinV2: BilliardsTableSkinV2 = {
  id: 'classic-pocket-club',
  felt: '#197a58',
  feltDark: '#0a4435',
  rail: '#87502b',
  railDark: '#2d160d',
  pocket: '#030303',
  light: {
    x: 0.5,
    y: 0.43,
    height: 0.82,
    ambient: 0.34,
    diffuse: 0.68,
    specular: 0.54,
    warmth: 0.17,
  },
  cue: {
    id: 'house-cue-walnut',
    tip: '#3d8aa0',
  },
};
