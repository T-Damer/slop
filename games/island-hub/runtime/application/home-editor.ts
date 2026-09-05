import { homeRules, type HomeState, type HomeCommand } from '../domain/home-registry.ts';
import { changeHomeItem } from '../domain/home.ts';

/** Draft state is disposable. The saved world changes only after an explicit commit. */
export class HomeEditor {
  public state: HomeState;
  private readonly history: HomeState[] = [];
  public constructor(public readonly original: HomeState) { this.state = original; }
  public get canUndo(): boolean { return this.history.length > 0; }
  public apply(id: string, command: HomeCommand): string | null {
    const result = changeHomeItem(this.state, id, command);
    if (result.error !== null) return result.error;
    if (result.state !== this.state) {
      this.history.push(this.state);
      if (this.history.length > homeRules.maximumUndo) this.history.shift();
      this.state = result.state;
    }
    return null;
  }
  public undo(): void { this.state = this.history.pop() ?? this.state; }
}
