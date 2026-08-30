import {
  islandGenerationStages,
  islandPreferenceOptions,
  islandPreferenceQuestions,
  islandRules,
} from '../domain/registry.ts';
import type {
  IslandPreferences,
} from '../domain/types.ts';

export interface IslandOnboardingController {
  readonly destroy: () => void;
}

export interface IslandOnboardingOptions {
  readonly onComplete: (preferences: IslandPreferences) => Promise<void>;
}

const onboardingActions = {
  start: 'start',
  choose: 'choose',
  next: 'next',
  back: 'back',
} as const;

export function mountIslandOnboarding(
  host: HTMLElement,
  options: IslandOnboardingOptions,
): IslandOnboardingController {
  return new IslandOnboarding(host, options);
}

class IslandOnboarding implements IslandOnboardingController {
  private questionIndex = -1;
  private generating = false;
  private disposed = false;
  private readonly timers = new Set<number>();
  private readonly selected: Record<keyof IslandPreferences, string> = {
    color: 'blue',
    music: 'lofi',
    activity: 'gardening',
    weather: 'sunny',
    season: 'spring',
    livingStyle: 'suburban',
    animal: 'raccoon',
  };

  public constructor(
    private readonly host: HTMLElement,
    private readonly options: IslandOnboardingOptions,
  ) {
    this.host.addEventListener('click', this.handleClick);
    this.renderWelcome();
  }

  public readonly destroy = (): void => {
    this.disposed = true;
    this.host.removeEventListener('click', this.handleClick);
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    this.host.innerHTML = '';
  };

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element) || this.generating) {
      return;
    }
    const actionElement = target.closest<HTMLElement>('[data-island-action]');
    const action = actionElement?.dataset.islandAction;
    if (action === onboardingActions.start) {
      this.questionIndex = 0;
      this.renderQuestion();
    } else if (action === onboardingActions.choose) {
      this.choose(actionElement);
    } else if (action === onboardingActions.next) {
      void this.next();
    } else if (action === onboardingActions.back) {
      this.back();
    }
  };

  private choose(element: HTMLElement | undefined): void {
    const key = element?.dataset.preferenceKey;
    const value = element?.dataset.preferenceValue;
    if (!isPreferenceKey(key) || value === undefined) {
      return;
    }
    this.selected[key] = value;
    this.renderQuestion();
  }

  private async next(): Promise<void> {
    if (this.questionIndex < islandPreferenceQuestions.length - 1) {
      this.questionIndex += 1;
      this.renderQuestion();
      return;
    }
    this.generating = true;
    await this.runGeneration();
  }

  private back(): void {
    if (this.questionIndex <= 0) {
      this.questionIndex = -1;
      this.renderWelcome();
      return;
    }
    this.questionIndex -= 1;
    this.renderQuestion();
  }

  private renderWelcome(): void {
    this.host.innerHTML = `
      <main class="island-onboarding" id="slop-island-onboarding">
        <section class="island-guide-card" aria-labelledby="island-guide-title">
          <div class="island-guide-avatar" aria-hidden="true">
            <span class="island-guide-face">✦</span>
          </div>
          <p class="island-guide-name">Луми · проводник SLOP</p>
          <h1 id="island-guide-title">Добро пожаловать в SLOP!</h1>
          <p>Это небольшой виртуальный мир, где можно играть и общаться с другими людьми.</p>
          <p>Для начала давай покажу тебе твой остров :)</p>
          <button class="island-primary-button" type="button" data-island-action="start">
            Познакомиться
          </button>
        </section>
      </main>
    `;
  }

  private renderQuestion(): void {
    const question = islandPreferenceQuestions[this.questionIndex];
    if (question === undefined) {
      return;
    }
    const options = islandPreferenceOptions[question.key];
    const progress = this.questionIndex + 1;
    const nextLabel = progress === islandPreferenceQuestions.length
      ? 'Создать остров'
      : 'Далее';
    this.host.innerHTML = `
      <main class="island-onboarding" id="slop-island-onboarding">
        <section class="island-preference-card">
          <div class="island-wizard-progress" aria-label="Шаг ${progress} из ${islandPreferenceQuestions.length}">
            <span style="--island-progress:${progress / islandPreferenceQuestions.length}"></span>
          </div>
          <p class="island-guide-name">Луми спрашивает</p>
          <h1>${question.title}</h1>
          <p class="island-question-subtitle">${question.subtitle}</p>
          <div class="island-chip-grid" role="group" aria-label="${question.title}">
            ${options.map((option) => renderChip(
              question.key,
              option,
              this.selected[question.key] === option.id,
            )).join('')}
          </div>
          <div class="island-wizard-actions">
            <button class="island-secondary-button" type="button" data-island-action="back">Назад</button>
            <button class="island-primary-button" type="button" data-island-action="next">${nextLabel}</button>
          </div>
        </section>
      </main>
    `;
  }

  private async runGeneration(): Promise<void> {
    for (let index = 0; index < islandGenerationStages.length; index += 1) {
      if (this.disposed) {
        return;
      }
      const stage = islandGenerationStages[index];
      if (stage === undefined) {
        continue;
      }
      this.renderGeneration(index);
      await this.delay(islandRules.generationStageMs);
    }
    if (!this.disposed) {
      await this.options.onComplete(toPreferences(this.selected));
    }
  }

  private renderGeneration(activeIndex: number): void {
    const active = islandGenerationStages[activeIndex];
    const progress = (activeIndex + 1) / islandGenerationStages.length;
    this.host.innerHTML = `
      <main class="island-onboarding island-generation" id="slop-island-onboarding">
        <section class="island-generation-card">
          <div class="island-generation-orbit" aria-hidden="true">
            <span>${active?.emoji ?? '🏝️'}</span>
          </div>
          <h1>Создаём твой остров</h1>
          <p class="island-generation-active">${active?.label ?? ''}</p>
          <div class="island-generation-track"><span style="--island-progress:${progress}"></span></div>
          <ol class="island-generation-list">
            ${islandGenerationStages.map((stage, index) => `
              <li class="${index <= activeIndex ? 'is-complete' : ''}">
                <span>${stage.emoji}</span>${stage.label}
              </li>
            `).join('')}
          </ol>
        </section>
      </main>
    `;
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, durationMs);
      this.timers.add(timer);
    });
  }
}

function renderChip(
  key: keyof IslandPreferences,
  option: { readonly id: string; readonly emoji: string; readonly label: string },
  selected: boolean,
): string {
  return `
    <button
      class="island-chip ${selected ? 'is-selected' : ''}"
      type="button"
      aria-pressed="${selected}"
      data-island-action="choose"
      data-preference-key="${key}"
      data-preference-value="${option.id}"
    ><span>${option.emoji}</span>${option.label}</button>
  `;
}

function isPreferenceKey(value: string | undefined): value is keyof IslandPreferences {
  return value === 'color'
    || value === 'music'
    || value === 'activity'
    || value === 'weather'
    || value === 'season'
    || value === 'livingStyle'
    || value === 'animal';
}

function toPreferences(selected: Record<keyof IslandPreferences, string>): IslandPreferences {
  return {
    color: selected.color as IslandPreferences['color'],
    music: selected.music as IslandPreferences['music'],
    activity: selected.activity as IslandPreferences['activity'],
    weather: selected.weather as IslandPreferences['weather'],
    season: selected.season as IslandPreferences['season'],
    livingStyle: selected.livingStyle as IslandPreferences['livingStyle'],
    animal: selected.animal as IslandPreferences['animal'],
  };
}
