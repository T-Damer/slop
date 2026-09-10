import { soundBuses, type SoundBus, type SoundMix } from '../domain/sound-settings.ts';
import type { IslandSoundscape } from './soundscape.ts';

const soundLabels: Record<SoundBus, string> = { master: 'Общая', music: 'Музыка', ambience: 'Окружение', effects: 'Действия' };
export class IslandSoundPanel {
  private readonly element = document.createElement('section');
  private readonly button = document.createElement('button');
  private readonly warning = document.createElement('small');
  public constructor(private readonly root: HTMLElement, private readonly sound: IslandSoundscape,
    mix: SoundMix, private readonly persist: (mix: SoundMix) => boolean) {
    this.button.type = 'button'; this.button.textContent = 'Звук';
    this.button.dataset.islandSound = '';
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'island-sound-controls');
    this.element.id = 'island-sound-controls'; this.element.className = 'island-sound-panel';
    this.element.setAttribute('aria-label', 'Громкость звука'); this.element.hidden = true;
    for (const bus of soundBuses) {
      const label = document.createElement('label'); label.textContent = soundLabels[bus];
      const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '100';
      input.value = String(mix[bus] * 100); input.dataset.soundBus = bus;
      input.setAttribute('aria-label', soundLabels[bus]); label.append(input); this.element.append(label);
    }
    this.warning.textContent = 'Звук включится после первого нажатия или шага.';
    this.element.append(this.warning);
    root.querySelector('.island-hud-actions')?.prepend(this.button);
    root.append(this.element);
    this.button.addEventListener('click', this.toggle);
    this.element.addEventListener('input', this.change);
    root.addEventListener('click', this.dismissForModal);
    root.addEventListener('keydown', this.escape);
  }
  public destroy(): void {
    this.button.removeEventListener('click', this.toggle); this.element.removeEventListener('input', this.change);
    this.root.removeEventListener('click', this.dismissForModal);
    this.root.removeEventListener('keydown', this.escape);
    this.button.remove(); this.element.remove();
  }
  private readonly dismissForModal = (event: Event): void => {
    if (event.target instanceof Element && event.target.closest('[data-island-shell-action="games"], [data-island-furnish]') !== null) this.dismiss();
  };
  private readonly escape = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape' || this.element.hidden) return;
    event.preventDefault(); event.stopPropagation(); this.dismiss(); this.button.focus();
  };
  private dismiss(): void { this.element.hidden = true; this.button.setAttribute('aria-expanded', 'false'); }
  private readonly toggle = (): void => {
    this.element.hidden = !this.element.hidden;
    this.button.setAttribute('aria-expanded', String(!this.element.hidden));
    this.warning.textContent = this.sound.snapshot().status === 'running' ? 'Настройки сохраняются на этом устройстве.' : 'Нажми или начни движение, чтобы разрешить звук.';
  };
  private readonly change = (): void => {
    const mix = this.sound.snapshot().mix;
    for (const input of this.element.querySelectorAll<HTMLInputElement>('[data-sound-bus]')) {
      const bus = input.dataset.soundBus as SoundBus;
      mix[bus] = Number(input.value) / 100;
    }
    this.sound.setMix(mix);
    this.warning.textContent = this.persist(mix) ? 'Громкость сохранена.' : 'Громкость изменена только на эту сессию.';
  };
}
