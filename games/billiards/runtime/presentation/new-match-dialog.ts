import { billiardsCues, selectedCue, selectCue } from './cue-selection.ts';
import { billiardsPresetIds, isBilliardsPresetId, tablePreset } from '../domain/table-presets.ts';
import type { BilliardsGameControllerV2 } from './controller-v2.ts';
import type { BilliardsViewElements } from './view-elements.ts';

const matchPicker = {
  title: 'Новая партия',
  notice: 'Американский — 8-ball. Русский — клубная свободная пирамида: любой биток, свояки, до 8 шаров. Штрафной шар выбирает соперник. Упрощённый отыгрыш: контакт + борт; не турнирный регламент.',
  options: [
    { id: billiardsPresetIds.american, name: 'Американский', detail: 'Широкие лузы · привычный пул' },
    { id: billiardsPresetIds.russian, name: 'Свободная пирамида', detail: 'Русский стол · клубные правила' },
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
    </fieldset><fieldset><legend>Кий · только внешний вид</legend>
    ${billiardsCues.map((cue) => `<label class="billiards-cue-card"><input type="radio" name="cue" value="${cue.id}" required>
      <span>${cue.name}<img src="${cue.url}" alt="" width="304" height="16"></span></label>`).join('')}
    </fieldset><p>${matchPicker.notice}</p><p><a href="${new URL('./audio-credits.txt?no-inline', import.meta.url).href}" target="_blank" rel="noopener">Звуки: авторы и лицензии</a></p>
    <footer><button type="submit" value="cancel" formnovalidate>Отмена</button>
    <button type="submit" value="start" data-billiards-new-match>Начать</button></footer>
  </form>`;
  view.root.append(dialog);
  const open = (): void => {
    if (dialog.open) return;
    controller.setPaused(true);
    const radio = dialog.querySelector<HTMLInputElement>(`input[value="${tablePreset(controller.snapshot().match.table).id}"]`);
    if (radio) radio.checked = true;
    const cue = dialog.querySelector<HTMLInputElement>(`input[name="cue"][value="${selectedCue(view.canvas)}"]`);
    if (cue) cue.checked = true;
    dialog.showModal();
    radio?.focus();
  };
  const escape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); dialog.close();
  };
  const close = (): void => { controller.setPaused(false); view.restart.focus({ preventScroll: true }); };
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const button = event.submitter;
    if (!(button instanceof HTMLButtonElement) || button.value !== 'start') { dialog.close(); return; }
    const choices = new FormData(dialog.querySelector('form')!);
    const preset = choices.get('preset');
    if (!isBilliardsPresetId(preset) || !selectCue(view.canvas, choices.get('cue'))) return;
    controller.restart(preset);
    dialog.close();
  };
  view.restart.addEventListener('click', open);
  open();
  dialog.addEventListener('submit', submit);
  dialog.addEventListener('keydown', escape);
  dialog.addEventListener('close', close);
  return () => {
    view.restart.removeEventListener('click', open);
    dialog.removeEventListener('submit', submit);
    dialog.removeEventListener('keydown', escape);
    dialog.removeEventListener('close', close);
    if (dialog.open) { dialog.close(); controller.setPaused(false); }
    dialog.remove();
  };
}
