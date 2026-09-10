/** Dialog focus and inertness stay separate from game routing and simulation pause. */
export class IslandMenuFocus {
  private previous: HTMLElement | null = null;
  private open = false;
  public constructor(private readonly root: HTMLElement, private readonly close: () => void) {
    root.addEventListener('keydown', this.keyDown);
  }
  public setOpen(open: boolean): void {
    const menu = this.root.querySelector<HTMLElement>('.island-game-menu');
    this.open = open;
    if (menu === null) return;
    menu.inert = !open;
    const world = menu.parentElement;
    for (const child of world?.children ?? []) {
      if (child instanceof HTMLElement && child !== menu) child.inert = open;
    }
    if (open) {
      this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      menu.querySelector<HTMLElement>('button')?.focus();
    } else this.previous?.focus();
  }
  public destroy(): void { this.setOpen(false); this.root.removeEventListener('keydown', this.keyDown); }
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.code === 'Escape') { event.preventDefault(); this.close(); return; }
    if (event.code !== 'Tab') return;
    const buttons = [...this.root.querySelectorAll<HTMLButtonElement>('.island-game-menu button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
}
