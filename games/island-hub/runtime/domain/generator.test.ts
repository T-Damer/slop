import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIslandBlueprint, isPointInsideIsland } from './generator.ts';
import type { IslandPreferences } from './types.ts';

const calmPreferences: IslandPreferences = {
  color: 'blue',
  music: 'lofi',
  activity: 'gardening',
  weather: 'sunny',
  season: 'spring',
  livingStyle: 'suburban',
  animal: 'raccoon',
};

const coastalPreferences: IslandPreferences = {
  ...calmPreferences,
  color: 'orange',
  activity: 'fishing',
  weather: 'misty',
  season: 'summer',
  livingStyle: 'coastal',
  animal: 'duck',
};

test('island generation is deterministic for one profile', () => {
  const first = buildIslandBlueprint('local-player', calmPreferences);
  const second = buildIslandBlueprint('local-player', calmPreferences);
  assert.deepEqual(first, second);
});

test('preferences change the stable island result', () => {
  const calm = buildIslandBlueprint('local-player', calmPreferences);
  const coastal = buildIslandBlueprint('local-player', coastalPreferences);
  assert.notEqual(calm.seed, coastal.seed);
  assert.notEqual(calm.palette.roof, coastal.palette.roof);
  assert.notDeepEqual(calm.activityZone, coastal.activityZone);
});

test('generated placements remain inside the walkable island', () => {
  const blueprint = buildIslandBlueprint('placement-test', calmPreferences);
  const placements = [
    blueprint.house,
    blueprint.animal,
    blueprint.activityZone,
    ...blueprint.trees,
    ...blueprint.rocks,
    ...blueprint.flowers,
    ...blueprint.portals,
  ];
  for (const placement of placements) {
    assert.equal(
      isPointInsideIsland(placement, blueprint, 0.2),
      true,
      `${'id' in placement ? placement.id : placement.destinationId} is outside`,
    );
  }
});

test('every island contains every local game portal', () => {
  const blueprint = buildIslandBlueprint('portal-test', calmPreferences);
  assert.deepEqual(
    blueprint.portals.map((portal) => portal.destinationId).sort(),
    ['billiards', 'junkyard-station', 'parking-jam'],
  );
});
