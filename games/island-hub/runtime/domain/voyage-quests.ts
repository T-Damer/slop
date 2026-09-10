import type { VoyageItemId, VoyageResidentId, VoyageState } from './voyage-registry.ts';

export interface VoyageQuest {
  readonly id: string; readonly owner: VoyageResidentId; readonly title: string; readonly request: string;
  readonly objective: string; readonly reward: string; readonly needs?: { readonly item: VoyageItemId; readonly count: number };
  readonly discoveries?: number; readonly requiredDiscoveries?: readonly string[]; readonly islands?: number; readonly prerequisite?: string;
}
export const voyageQuests: readonly VoyageQuest[] = [
  { id: 'familiar-paths', owner: 'lumi', title: 'Карта знакомых троп',
    request: 'Дом — только начало. Найди три места на своём острове и расскажи, какое понравилось больше.',
    objective: 'Открой 3 места на родном острове и вернись к Луми.', discoveries: 3, reward: 'Морской фонарь у дома' },
  { id: 'garden-shells', owner: 'mira', title: 'Море в цветочном саду',
    request: 'Хочу украсить клумбу ракушками. Принесёшь три? Они лежат на южном пляже и в Ракушечной бухте.',
    objective: 'Принеси Мире 3 ракушки.', needs: { item: 'shell', count: 3 }, reward: 'Цветочная корзина у дома' },
  { id: 'pine-letter', owner: 'timo', title: 'Письмо из рощи',
    request: 'В Сосновой роще остался старый почтовый ящик. Поищи рядом бутылку с письмом. Лодка стоит на юге.',
    objective: 'Найди письмо у Забытой почты в Сосновой роще и отдай Тимо.',
    needs: { item: 'letter', count: 1 }, reward: 'Почтовый ящик путешественника' },
  { id: 'little-archipelago', owner: 'lumi', title: 'Мой маленький архипелаг', prerequisite: 'familiar-paths',
    request: 'Теперь ты знаешь родные тропинки. Побывай на обоих соседних островах и принеси кусочек морского стекла.',
    objective: 'Посети бухту и рощу, принеси Луми 1 морское стекло.', islands: 3,
    needs: { item: 'glass', count: 1 }, reward: 'Праздничные флажки во дворе' },
  { id: 'forest-echo', owner: 'timo', title: 'Эхо старого леса', prerequisite: 'familiar-paths',
    request: 'За тенистым лесом есть каменный вход. Пройди старой тропой до пещеры и запомни оба места для моей карты.',
    objective: 'Открой Тенистый лес и Каменную пещеру, затем вернись к Тимо.',
    requiredDiscoveries: ['home:grove', 'home:cave'], reward: 'Лесной фонарь у дома' },
];
export function questReady(state: VoyageState, quest: VoyageQuest): boolean {
  return (!quest.needs || state.inventory[quest.needs.item] >= quest.needs.count)
    && (!quest.discoveries || state.discovered.filter((id) => id.startsWith('home:')).length >= quest.discoveries)
    && (!quest.requiredDiscoveries || quest.requiredDiscoveries.every((id) => state.discovered.includes(id)))
    && (!quest.islands || state.visited.length >= quest.islands);
}
export function questStatus(state: VoyageState, quest: VoyageQuest): 'locked' | 'available' | 'active' | 'ready' | 'complete' {
  if (state.claimed.includes(quest.id)) return 'complete';
  if (quest.prerequisite && !state.claimed.includes(quest.prerequisite)) return 'locked';
  if (!state.accepted.includes(quest.id)) return 'available';
  return questReady(state, quest) ? 'ready' : 'active';
}
export function questCounter(state: VoyageState, quest: VoyageQuest): string {
  if (questStatus(state, quest) === 'complete') return 'Выполнено';
  const counters = [];
  if (quest.discoveries) counters.push(`${Math.min(quest.discoveries, state.discovered.filter((id) => id.startsWith('home:')).length)}/${quest.discoveries} мест`);
  if (quest.requiredDiscoveries) counters.push(`${quest.requiredDiscoveries.filter((id) => state.discovered.includes(id)).length}/${quest.requiredDiscoveries.length} мест`);
  if (quest.islands) counters.push(`${state.visited.length}/${quest.islands} острова`);
  if (quest.needs) counters.push(`${Math.min(quest.needs.count, state.inventory[quest.needs.item])}/${quest.needs.count} находок`);
  return counters.join(' · ');
}
