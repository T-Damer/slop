export const islandPreferenceIds = {
  color: ['blue', 'green', 'pink', 'orange', 'purple', 'yellow'],
  music: ['lofi', 'pop', 'electronic', 'jazz', 'nature'],
  activity: ['gardening', 'fishing', 'picnic', 'crafting', 'exploring', 'social'],
  weather: ['sunny', 'cloudy', 'rainy', 'misty', 'snowy'],
  season: ['spring', 'summer', 'autumn', 'winter'],
  livingStyle: ['city', 'suburban', 'rural', 'coastal'],
  animal: ['cat', 'dog', 'rabbit', 'raccoon', 'fox', 'duck'],
} as const;

export const islandPreferenceOptions = {
  color: [
    { id: 'blue', emoji: '💙', label: 'Синий' },
    { id: 'green', emoji: '💚', label: 'Зелёный' },
    { id: 'pink', emoji: '🩷', label: 'Розовый' },
    { id: 'orange', emoji: '🧡', label: 'Оранжевый' },
    { id: 'purple', emoji: '💜', label: 'Фиолетовый' },
    { id: 'yellow', emoji: '💛', label: 'Жёлтый' },
  ],
  music: [
    { id: 'lofi', emoji: '🎧', label: 'Lo-fi' },
    { id: 'pop', emoji: '🎤', label: 'Поп' },
    { id: 'electronic', emoji: '🎛️', label: 'Электроника' },
    { id: 'jazz', emoji: '🎷', label: 'Джаз' },
    { id: 'nature', emoji: '🌊', label: 'Звуки природы' },
  ],
  activity: [
    { id: 'gardening', emoji: '🌱', label: 'Садоводство' },
    { id: 'fishing', emoji: '🎣', label: 'Рыбалка' },
    { id: 'picnic', emoji: '🧺', label: 'Пикники' },
    { id: 'crafting', emoji: '🛠️', label: 'Мастерить' },
    { id: 'exploring', emoji: '🧭', label: 'Исследовать' },
    { id: 'social', emoji: '🎉', label: 'Общаться' },
  ],
  weather: [
    { id: 'sunny', emoji: '☀️', label: 'Солнечно' },
    { id: 'cloudy', emoji: '⛅', label: 'Облачно' },
    { id: 'rainy', emoji: '🌧️', label: 'Дождь' },
    { id: 'misty', emoji: '🌫️', label: 'Туман' },
    { id: 'snowy', emoji: '❄️', label: 'Снег' },
  ],
  season: [
    { id: 'spring', emoji: '🌸', label: 'Весна' },
    { id: 'summer', emoji: '🌻', label: 'Лето' },
    { id: 'autumn', emoji: '🍂', label: 'Осень' },
    { id: 'winter', emoji: '⛄', label: 'Зима' },
  ],
  livingStyle: [
    { id: 'city', emoji: '🏙️', label: 'Город' },
    { id: 'suburban', emoji: '🏡', label: 'Пригород' },
    { id: 'rural', emoji: '🌾', label: 'За городом' },
    { id: 'coastal', emoji: '🏝️', label: 'У моря' },
  ],
  animal: [
    { id: 'cat', emoji: '🐈', label: 'Кот' },
    { id: 'dog', emoji: '🐕', label: 'Собака' },
    { id: 'rabbit', emoji: '🐇', label: 'Кролик' },
    { id: 'raccoon', emoji: '🦝', label: 'Енот' },
    { id: 'fox', emoji: '🦊', label: 'Лиса' },
    { id: 'duck', emoji: '🦆', label: 'Утка' },
  ],
} as const;

export const islandPreferenceQuestions = [
  { key: 'color', title: 'Какой цвет тебе ближе?', subtitle: 'Он появится на доме и одежде.' },
  { key: 'music', title: 'Что включим на острове?', subtitle: 'Позже это станет музыкальным профилем.' },
  { key: 'activity', title: 'Чем любишь заниматься?', subtitle: 'Мы подготовим тематический уголок.' },
  { key: 'weather', title: 'Какая погода уютнее?', subtitle: 'Она задаст освещение и атмосферу.' },
  { key: 'season', title: 'Любимое время года?', subtitle: 'Сезон влияет на палитру и растения.' },
  { key: 'livingStyle', title: 'Где тебе комфортнее?', subtitle: 'Так мы выберем характер острова.' },
  { key: 'animal', title: 'Кого поселим первым?', subtitle: 'Новый сосед будет ждать тебя у дома.' },
] as const;

export const islandGenerationStages = [
  { id: 'terrain', emoji: '🏝️', label: 'Формируем ландшафт' },
  { id: 'vegetation', emoji: '🌿', label: 'Генерируем растительность' },
  { id: 'rocks', emoji: '🪨', label: 'Раскладываем камни' },
  { id: 'animals', emoji: '🐾', label: 'Селим животных' },
  { id: 'shore', emoji: '🌊', label: 'Облагораживаем берег' },
] as const;

export const islandDestinationIds = {
  parkingJam: 'parking-jam',
  junkyardStation: 'junkyard-station',
} as const;

export const islandCameraModes = ['cozy', 'standard', 'overview'] as const;

export const islandRules = {
  schemaVersion: 1,
  coastlinePoints: 32,
  baseRadius: 8.4,
  radiusVariation: 1.2,
  treeCount: 12,
  rockCount: 9,
  flowerCount: 18,
  minimumPlacementDistance: 1.15,
  playerSpeed: 4.2,
  portalRadius: 1.35,
  portalHoldSeconds: 0.8,
  generationStageMs: 340,
  storageKey: 'slop.personal-island.v1',
  playerIdKey: 'slop.local-player-id.v1',
} as const;
