import { billiardsPresetIds, isBilliardsPresetId, tablePreset } from '../domain/table-presets.ts';
import type { BilliardsGameControllerV2 } from './controller-v2.ts';
import type { BilliardsViewElements } from './view-elements.ts';

const matchPicker = {
  title: 'Новая партия',
  notice: 'Оба варианта пока играются по правилам 8-ball: сплошные, полосатые и восьмёрка. Русский — геометрический пресет, не правила пирамиды.',
  options: [
    { id: billiardsPresetIds.american, name: 'Американский', detail: 'Широкие лузы · привычный пул' },
    { id: billiardsPresetIds.russian, name: 'Русский', detail: 'Тесные лузы · больше точности' },
  ],
} as const;

export function bindNewMatchDialog(view: BilliardsViewElements, controller: BilliardsGameControllerV2): () => void {
  const dialog = document.createElement('dialog');
  dialog.className = 'billiards-match-dialog';
  dialog.setAttribute('aria-labelledby', 'billiards-match-title');
  dialog.innerHTML = `<form method="dialog">
    <h2 id="billiards-match-title">${matchPicker.title}</h2>
    <fieldset><legend>Тип стола</legend>${matchPicker.options.map((option) => `
      <label class="billiards-preset-card"><input type="radio" name="preset" value="${option.id}" required>
      <span><strong>${option.name}</strong><small>${option.detail}</small></span></label>`).join('')}
    </fieldset><p>${matchPicker.notice}</p>
    <footer><button type="submit" value="cancel" formnovalidate>Отмена</button>
    <button type="submit" value="start" data-billiards-new-match>Начать</button></footer>
  </form>`;
  view.root.append(dialog);
  const open = (): void => {
    if (dialog.open) return;
    controller.setPaused(true);
    const radio = dialog.querySelector<HTMLInputElement>(`input[value="${tablePreset(controller.snapshot().match.table).id}"]`);
    if (radio) radio.checked = true;
    dialog.showModal();
    radio?.focus();
  };
  const close = (): void => { controller.setPaused(false); view.restart.focus({ preventScroll: true }); };
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const button = event.submitter;
    if (!(button instanceof HTMLButtonElement) || button.value !== 'start') { dialog.close(); return; }
    const preset = new FormData(dialog.querySelector('form')!).get('preset');
    if (!isBilliardsPresetId(preset)) return;
    controller.restart(preset);
    dialog.close();
  };
  view.restart.addEventListener('click', open);
  dialog.addEventListener('submit', submit);
  dialog.addEventListener('close', close);
  return () => {
    view.restart.removeEventListener('click', open);
    dialog.removeEventListener('submit', submit);
    dialog.removeEventListener('close', close);
    if (dialog.open) { dialog.close(); controller.setPaused(false); }
    dialog.remove();
  };
}
