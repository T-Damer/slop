import type { BilliardsGameControllerV2 } from './controller-v2.ts';
import type { BilliardsViewElements } from './view-elements.ts';

/** The picker is not needed during play. Load once on demand, retaining pause
 * ownership while fetching and cancelling installation when its route is gone. */
export function bindLazyNewMatch(view: BilliardsViewElements, controller: BilliardsGameControllerV2): () => void {
  let disposed = false;
  let loading = false;
  let removeDialog: (() => void) | null = null;
  const open = async (): Promise<void> => {
    if (loading || removeDialog !== null || disposed) return;
    loading = true;
    controller.setPaused(true);
    view.restart.setAttribute('aria-busy', 'true');
    try {
      const module = await import('./new-match-dialog.ts');
      if (!disposed) {
        view.restart.removeEventListener('click', activate);
        removeDialog = module.bindNewMatchDialog(view, controller);
      }
    } catch (error) {
      if (!disposed) {
        controller.setPaused(false);
        view.hint.textContent = 'Не удалось открыть новую партию. Попробуйте ещё раз.';
        console.error(error);
      }
    } finally {
      loading = false;
      view.restart.removeAttribute('aria-busy');
    }
  };
  const activate = (): void => { void open(); };
  view.restart.addEventListener('click', activate);
  return () => {
    disposed = true;
    view.restart.removeEventListener('click', activate);
    removeDialog?.();
    if (loading) controller.setPaused(false);
  };
}
