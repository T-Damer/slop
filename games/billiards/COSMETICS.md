# Pocket Club cosmetic architecture

Cosmetics are presentation-only inventory. They must never alter deterministic collision geometry, rules, matchmaking, shot validation, or authoritative hashes.

## Planned collectible slots

| Slot | Presentation ownership | Authoritative gameplay effect |
| --- | --- | --- |
| Table skin | felt, timber, metal, pocket trim and table light profile | none |
| Cue skin | shaft, butt, wrap, ferrule, tip and finish | none |
| Ball set | albedo, stripe treatment, number typography and gloss | none |
| Room | floor, walls, lamps, furniture, smoke and ambience | none |
| Menu theme | panels, ornaments, typography and transitions | none |

## Stable identifiers

Each owned cosmetic uses an immutable string identifier. Network state may carry selected identifiers, but clients resolve those identifiers through a versioned local catalog. Unknown identifiers fall back to the standard house set.

```ts
interface BilliardsCosmeticLoadout {
  readonly tableSkinId: string;
  readonly cueSkinId: string;
  readonly ballSetId: string;
  readonly roomThemeId: string;
  readonly menuThemeId: string;
}
```

## Lighting contract

The table skin owns the light position and material response used by both the cue and balls. A room can change decorative lamps, but it cannot silently change the gameplay camera or physics. Competitive modes may lock the light profile for visibility while retaining other cosmetic materials.

## Asset constraints

- Every asset needs provenance and a license declaration.
- Cosmetic packages are lazy-loaded and excluded from the initial gameplay bundle unless selected.
- Audio cosmetics may change timbre only within readability limits; collision timing and semantic categories remain fixed.
- Paid content must have a neutral fallback with equal gameplay clarity.
- Catalog and entitlement code belong outside the deterministic billiards domain.
