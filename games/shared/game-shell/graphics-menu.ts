import { graphicsPreferences, graphicsSettings, type GraphicsPreference } from './graphics-settings.ts';
import { phosphorIcon } from './phosphor.ts';
import './graphics-menu.css';

const labels = { auto: 'Авто', high: 'Высокая', balanced: 'Средняя', low: 'Экономная' };
/** Shared across routes. Settings affect rendering, never deterministic gameplay. */
export function mountGraphicsMenu(parent: HTMLElement): () => void {
  const host = document.createElement('div');
  host.className = 'slop-graphics';
  host.innerHTML = `<button class="slop-graphics-launcher" type="button" aria-label="Настройки графики"
    title="Настройки графики">${phosphorIcon('settings')}</button>
    <dialog aria-labelledby="slop-graphics-title"><form method="dialog">
    <h2 id="slop-graphics-title">Графика и камера</h2>
    <label>Качество графики <select name="quality">${graphicsPreferences.map((id) =>
      `<option value="${id}">${labels[id]}</option>`).join('')}</select></label>
    <p>Авто подбирает качество. Экономная графика снижает детализацию и эффекты; в бильярде остаются тени и блики.</p>
    <label><input type="checkbox" name="autoZoom"> Приближать прицел на телефоне</label>
    <label><input type="checkbox" name="reducedMotion"> Уменьшить анимации</label>
    <p>Камера: два пальца — масштаб и сдвиг. «Обзор» возвращает весь стол. Настройки сохраняются на устройстве.</p>
    <button type="submit">Готово</button></form></dialog>`;
  parent.append(host);
  const launcher = host.querySelector('button')!, dialog = host.querySelector('dialog')!;
  const quality = host.querySelector<HTMLSelectElement>('select')!;
  const autoZoom = host.querySelector<HTMLInputElement>('[name="autoZoom"]')!;
  const motion = host.querySelector<HTMLInputElement>('[name="reducedMotion"]')!;
  const unsubscribe = graphicsSettings.subscribe((value) => {
    quality.value = value.quality; autoZoom.checked = value.autoZoom; motion.checked = value.reducedMotion;
  });
  const open = (): void => { if (!dialog.open) dialog.showModal(); };
  const change = (): void => graphicsSettings.set({ quality: quality.value as GraphicsPreference,
    autoZoom: autoZoom.checked, reducedMotion: motion.checked });
  const close = (): void => { launcher.focus({ preventScroll: true }); };
  const key = (event: KeyboardEvent): void => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  };
  launcher.addEventListener('click', open); dialog.addEventListener('change', change);
  dialog.addEventListener('keydown', key); dialog.addEventListener('close', close);
  return () => { unsubscribe(); dialog.close(); host.remove(); };
}
