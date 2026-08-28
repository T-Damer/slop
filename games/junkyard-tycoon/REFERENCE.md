# Junkyard Station reference boundary

The gameplay direction was inspired by the broad interaction loop shown in **Gas Station: Junkyard Tycoon** on MSN Games:

- move a character through a compact 3D work area;
- approach stations, objects, or people;
- show a contextual icon and interaction progress;
- play a local animation and apply a domain-owned result;
- turn repeated interactions into construction and business progression.

Junkyard Station is an original implementation. Do not copy or extract the reference game's source code, level layout, branding, UI composition, models, textures, animation clips, audio, text, or economy values.

## Reusable contract

Future character-driven tycoon games should compose `games/shared/proximity-world/domain` for movement, target selection, progress, cooldowns, and completion events. Each game owns only its interaction catalogue, rewards, progression rules, world presentation, and action animations.

## First vertical slice

The current loop is intentionally small:

1. speak to the mechanic;
2. clear three junk piles for scrap and cash;
3. build the fuel pump;
4. fuel a customer vehicle;
5. collect payment at the register.

Employees, offline income, upgrades, multiple locations, ads, and monetization remain outside this pass.
