export const hubGameIds = {
  parkingJam: 'parking-jam',
  junkyardStation: 'junkyard-station',
} as const;

export const hubGameCatalog = [
  {
    id: hubGameIds.junkyardStation,
    title: 'Junkyard Station',
    description: 'Walk, collect, process, serve customers, and improve a roadside junkyard.',
    path: './games/junkyard-station/',
    icon: 'junkyard',
    badge: 'World-kit base',
  },
  {
    id: hubGameIds.parkingJam,
    title: 'Parking Jam',
    description: 'Release the right cars, board passenger groups, and keep the pickup bays moving.',
    path: './games/parking-jam/',
    icon: 'parking',
    badge: 'Puzzle',
  },
];
