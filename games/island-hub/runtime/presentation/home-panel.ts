import { HomeEditor } from '../application/home-editor.ts';
import { homeRules, homeCatalog, type HomeState, type HomeCommand } from '../domain/home-registry.ts';

interface HomePanelActions {
  preview(state: HomeState, selected: string | null): void;
  save(state: HomeState): boolean;
  close(): void;
  sound(): void;
}
const editorActions = {
  north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0],
} as const;
export class HomePanel {
  public readonly editor: HomeEditor;
  public readonly element = document.createElement('section');
  private readonly select = document.createElement('select');
  private readonly message = document.createElement('p');
  private selected: string;
  private readonly previousFocus = document.activeElement;
  public constructor(private readonly root: HTMLElement, state: HomeState, private readonly actions: HomePanelActions) {
    this.editor = new HomeEditor(state);
    this.selected = state.items[0]?.id ?? '';
    this.element.className = 'home-editor';
    this.element.setAttribute('aria-label', 'Обустройство дома');
    this.element.innerHTML = `<strong>Обустройство</strong><small>Выбери мебель в комнате или в списке.</small>
      <div class="home-editor-arrows"><button data-home-edit="west" aria-label="Передвинуть влево">←</button>
      <button data-home-edit="north" aria-label="Передвинуть назад">↑</button><button data-home-edit="south" aria-label="Передвинуть вперёд">↓</button>
      <button data-home-edit="east" aria-label="Передвинуть вправо">→</button></div>
      <div class="home-editor-tools"><button data-home-edit="rotate">Повернуть</button><button data-home-edit="store">В хранение</button>
      <button data-home-edit="place">Поставить</button><button data-home-edit="undo">Назад</button></div>
      <div class="home-editor-confirm"><button data-home-edit="save">Сохранить</button><button data-home-edit="cancel">Отмена</button></div>`;
    this.select.setAttribute('aria-label', 'Предмет мебели');
    this.select.dataset.homeSelection = '';
    this.element.insertBefore(this.select, this.element.querySelector('.home-editor-arrows'));
    this.message.setAttribute('role', 'status');
    this.element.insertBefore(this.message, this.element.querySelector('.home-editor-confirm'));
    this.select.addEventListener('change', this.selectChanged);
    this.element.addEventListener('click', this.click);
    root.addEventListener('keydown', this.keyDown);
    root.append(this.element);
    root.querySelector('.personal-island')?.classList.add('is-editing');
    this.refresh(); this.select.focus();
  }
  public selectItem(id: string): void { this.selected = id; this.refresh(); }
  public destroy(): void {
    this.root.removeEventListener('keydown', this.keyDown);
    this.element.removeEventListener('click', this.click);
    this.select.removeEventListener('change', this.selectChanged);
    this.element.remove();
    this.root.querySelector('.personal-island')?.classList.remove('is-editing');
    if (this.previousFocus instanceof HTMLElement && this.previousFocus.isConnected) this.previousFocus.focus();
  }
  public cancel(): void { this.actions.preview(this.editor.original, null); this.actions.close(); }
  private readonly selectChanged = (): void => { this.selected = this.select.value; this.refresh(); };
  private readonly click = (event: Event): void => {
    const action = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-home-edit]')?.dataset.homeEdit : undefined;
    if (action !== undefined) this.perform(action);
  };
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') { event.preventDefault(); event.stopPropagation(); this.cancel(); return; }
    if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
    const action = { ArrowUp: 'north', ArrowDown: 'south', ArrowLeft: 'west', ArrowRight: 'east', KeyR: 'rotate' }[event.code];
    if (action !== undefined) { event.preventDefault(); event.stopPropagation(); this.perform(action); }
  };
  private perform(action: string): void {
    if (action === 'cancel') { this.cancel(); return; }
    if (action === 'save') {
      if (this.actions.save(this.editor.state)) { this.actions.close(); return; }
      this.message.textContent = homeRules.messages.failed; return;
    }
    this.actions.sound();
    if (action === 'undo') { this.editor.undo(); this.refresh(); return; }
    const item = this.editor.state.items.find((entry) => entry.id === this.selected);
    if (item === undefined) return;
    let command: HomeCommand;
    if (action === 'rotate' || action === 'store' || action === 'place') command = { kind: action };
    else {
      const offset = editorActions[action as keyof typeof editorActions];
      if (offset === undefined || !item.placed) return;
      command = { kind: 'move', x: item.x + offset[0] * homeRules.grid, z: item.z + offset[1] * homeRules.grid };
    }
    const error = this.editor.apply(item.id, command);
    this.refresh(); this.message.textContent = error ?? 'Предпросмотр. Сохранить — применить; Отмена — вернуть прежнюю обстановку.';
  }
  private refresh(): void {
    this.select.replaceChildren();
    for (const item of this.editor.state.items) {
      const option = document.createElement('option'); option.value = item.id;
      option.textContent = homeCatalog[item.kind].label + (item.placed ? '' : ' · в хранении');
      this.select.append(option);
    }
    this.select.value = this.selected;
    const item = this.editor.state.items.find((entry) => entry.id === this.selected);
    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-home-edit]')) {
      const action = button.dataset.homeEdit;
      button.disabled = action === 'undo' ? !this.editor.canUndo
        : action === 'place' ? item?.placed !== false
          : ['north', 'south', 'east', 'west', 'rotate', 'store'].includes(action ?? '') ? item?.placed !== true : false;
    }
    this.actions.preview(this.editor.state, this.selected);
  }
}
