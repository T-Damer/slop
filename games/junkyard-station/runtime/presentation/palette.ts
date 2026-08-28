export const junkyardPalette = {
  asphalt: 0x596268,
  asphaltDark: 0x3e474c,
  concrete: 0xb9ad93,
  cream: 0xf5e0ad,
  orange: 0xe98b35,
  red: 0xc94c3e,
  darkRed: 0x8f322c,
  steel: 0x7f8d91,
  darkSteel: 0x39474d,
  tire: 0x22282b,
  glass: 0x91c9cf,
  fuel: 0x4aa67f,
  wood: 0x8d603a,
  fence: 0xa2a8a4,
  customerShirt: 0x4e8fda,
  customerTrousers: 0x313b54,
  sign: 0xffc857,
  skin: 0xe9b78f,
} as const;

export function createJunkyardMaterialOptions(
  color: number,
  roughness: number,
  metalness = 0.02,
): { readonly color: number; readonly roughness: number; readonly metalness: number } {
  return { color, roughness, metalness };
}
