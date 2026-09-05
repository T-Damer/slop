import type { IslandBlueprint, IslandPoint } from '../domain/types.ts';
import { commandVoyage, observeVoyage, type VoyageCommand } from '../domain/voyage.ts';
import { voyageRegions, voyageResidents, voyageRules, type VoyageState, type VoyageResidentId, type VoyageRegionId } from '../domain/voyage-registry.ts';
import { questCounter, questStatus, voyageQuests } from '../domain/voyage-quests.ts';
import { notebookMarkup, neighborMarkup, dockMarkup, closeButton, type VoyageTab } from './voyage-notebook.ts';

interface VoyageActions {
  save(state: VoyageState): boolean; changed(state: VoyageState): void; inputChanged(): void;
  travel(state: VoyageState): void; message(text: string): void; sound(): void;
}
export class VoyageController {
  public state: VoyageState;
  private readonly dialog = document.createElement('dialog');
  private readonly journal = document.createElement('button');
  private readonly tracker = document.createElement('div');
  private tracked: string | null = null;
  private neighbor: VoyageResidentId | null = null;
  private elapsed = 0;
  private disposed = false;
  private indoors = false;
  public constructor(private readonly root: HTMLElement, private readonly world: IslandBlueprint,
    private readonly player: IslandPoint, state: VoyageState, private readonly actions: VoyageActions) {
    this.state = state;
    this.dialog.className = 'voyage-dialog'; this.dialog.setAttribute('aria-label', 'Дневник и разговоры');
    this.journal.type = 'button'; this.journal.className = 'voyage-journal';
    this.journal.textContent = 'Дневник'; this.journal.dataset.voyageJournal = '';
    root.querySelector('.island-hud-actions')?.prepend(this.journal);
    this.tracker.className = 'voyage-tracker'; this.tracker.dataset.voyageTracker = '';
    root.querySelector('.personal-island')?.append(this.tracker); root.append(this.dialog);
    this.journal.addEventListener('click', this.openNotebook);
    this.dialog.addEventListener('click', this.handleClick);
    this.dialog.addEventListener('close', this.closed);
    this.renderTracker(); this.actions.changed(state);
    const name = root.querySelector('.island-name-card strong');
    if (name) name.textContent = voyageRegions[state.region].name;
  }
  public get blocked(): boolean { return this.dialog.open; }
  public setIndoors(inside: boolean): void {
    this.indoors = inside; this.journal.disabled = inside; this.tracker.hidden = inside;
  }
  public snapshot() { return { state: this.state, layout: this.world.exploration, blueprint: this.world, blocked: this.blocked }; }
  public observe(delta: number): void {
    if (this.indoors || this.blocked) return;
    this.elapsed += delta;
    if (this.elapsed < voyageRules.objectiveRefreshSeconds) return;
    this.elapsed = 0;
    const next = observeVoyage(this.state, this.world, this.player);
    if (next !== this.state && this.commit(next)) {
      const id = next.discovered.at(-1)?.split(':')[1];
      const site = this.world.exploration?.sites.find((entry) => entry.id === id);
      this.actions.message(`Новое место: ${site?.name ?? 'островная тропинка'}`); this.actions.sound();
    }
    this.renderTracker();
  }
  public activate(id: string): void {
    if (this.blocked) return;
    const layout = this.world.exploration;
    if (!layout) return;
    if (id === 'voyage:dock') { this.show(dockMarkup(this.state)); return; }
    const npc = layout.residents.find((entry) => id === `voyage:npc:${entry.id}`);
    if (npc) {
      if (this.operate({ kind: 'talk', id: npc.id })) { this.neighbor = npc.id; this.show(neighborMarkup(this.state, npc.id)); }
      return;
    }
    const pickup = layout.pickups.find((entry) => id === `voyage:pickup:${entry.id}`);
    if (pickup) {
      if (this.operate({ kind: 'collect', id: pickup.id })) {
        this.actions.message(pickup.item === 'letter' ? 'Письмо найдено. Тимо ждёт на родном острове.' : 'Находка в кармане. Загляни в дневник.');
      }
      return;
    }
    const site = layout.sites.find((entry) => id === `voyage:site:${entry.id}`);
    if (site) this.show(`<header><div><small>Место на острове</small><h2>${site.name}</h2></div>${closeButton()}</header><p>${site.text}</p>`);
  }
  public destroy(): void {
    this.disposed = true;
    this.journal.removeEventListener('click', this.openNotebook);
    this.dialog.removeEventListener('click', this.handleClick); this.dialog.removeEventListener('close', this.closed);
    this.dialog.close(); this.dialog.remove(); this.journal.remove(); this.tracker.remove();
  }
  private commit(next: VoyageState): boolean {
    if (next === this.state) return true;
    if (!this.actions.save(next)) { this.actions.message(voyageRules.messages.storage); return false; }
    this.state = next; this.actions.changed(next); return true;
  }
  private operate(command: VoyageCommand): boolean {
    const update = commandVoyage(this.state, this.world, this.player, command);
    if (update.error) { this.actions.message(update.error); return false; }
    if (!this.commit(update.state)) return false;
    this.actions.sound(); this.renderTracker(); return true;
  }
  private readonly openNotebook = (): void => { this.show(notebookMarkup(this.state, this.world, this.player, 'quests')); };
  private show(markup: string): void {
    this.dialog.innerHTML = markup;
    if (!this.dialog.open) { this.dialog.showModal(); this.actions.inputChanged(); }
    this.dialog.querySelector<HTMLButtonElement>('button')?.focus();
  }
  private readonly closed = (): void => {
    if (!this.disposed) { this.actions.inputChanged(); this.journal.focus(); }
  };
  private readonly handleClick = (event: Event): void => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button) return;
    if (button.hasAttribute('data-voyage-close')) { this.dialog.close(); return; }
    const tab = button.dataset.voyageTab;
    if (tab === 'quests' || tab === 'map' || tab === 'finds') { this.show(notebookMarkup(this.state, this.world, this.player, tab as VoyageTab)); return; }
    const tracked = button.dataset.voyageTrack;
    if (tracked && voyageQuests.some((quest) => quest.id === tracked)) { this.tracked = tracked; this.dialog.close(); this.renderTracker(); return; }
    const region = button.dataset.voyageTravel;
    if (region && Object.hasOwn(voyageRegions, region)) {
      if (this.operate({ kind: 'travel', region: region as VoyageRegionId })) this.actions.travel(this.state);
      return;
    }
    const kind = button.dataset.voyageCommand;
    const id = button.dataset.questId;
    if ((kind === 'accept' || kind === 'claim') && id && this.operate({ kind, id })) {
      if (kind === 'accept') this.tracked = id;
      else this.actions.message(voyageRules.messages.completed);
      if (this.neighbor) this.show(neighborMarkup(this.state, this.neighbor));
    }
  };
  private renderTracker(): void {
    const quest = voyageQuests.find((entry) => entry.id === this.tracked && ['active', 'ready'].includes(questStatus(this.state, entry)))
      ?? voyageQuests.find((entry) => ['active', 'ready'].includes(questStatus(this.state, entry)));
    const point = this.goalPoint(quest?.id ?? null);
    const distance = point ? Math.round(Math.hypot(this.player.x - point.x, this.player.z - point.z)) : null;
    const direction = point ? Math.atan2(point.x - this.player.x, this.player.z - point.z) : 0;
    const title = quest ? `${quest.title} · ${questCounter(this.state, quest)}` : 'Знакомство с островом';
    const detail = quest ? (questStatus(this.state, quest) === 'ready' ? `Вернись: ${voyageResidents[quest.owner].name}` : quest.objective)
      : 'Поговори с Луми рядом с домом или открой карту.';
    this.tracker.innerHTML = `<span class="voyage-compass" style="transform:rotate(${direction}rad)" aria-hidden="true">↑</span>
      <div><strong>${title}</strong><small>${detail}</small></div>${distance === null ? '' : `<span>${distance} м</span>`}`;
  }
  private goalPoint(id: string | null): IslandPoint | null {
    const layout = this.world.exploration;
    if (!layout) return null;
    const quest = voyageQuests.find((entry) => entry.id === id);
    if (!quest || questStatus(this.state, quest) === 'ready') return layout.residents.find((entry) => entry.id === (quest?.owner ?? 'lumi'))?.point ?? layout.dock;
    if (quest.requiredDiscoveries) {
      const missing = quest.requiredDiscoveries.find((key) => !this.state.discovered.includes(key));
      if (missing) {
        const [region, siteId] = missing.split(':');
        if (region === this.state.region) return layout.sites.find((site) => site.id === siteId)?.point ?? layout.dock;
        return layout.dock;
      }
    }
    if (quest.discoveries && this.state.discovered.filter((key) => key.startsWith('home:')).length < quest.discoveries) {
      return this.state.region === 'home' ? layout.sites.find((site) => !this.state.discovered.includes(`home:${site.id}`))?.point ?? layout.dock : layout.dock;
    }
    if (quest.needs && this.state.inventory[quest.needs.item] < quest.needs.count) {
      return layout.pickups.find((pickup) => pickup.item === quest.needs!.item && !this.state.collected.includes(pickup.id))?.point ?? layout.dock;
    }
    return layout.dock;
  }
}
