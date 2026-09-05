import { delay, evaluate } from './cdp-client.mjs';

export function createLayoutExpression(quality, ui) {
  return `(() => {
    const failures = [];
    const root = document.querySelector(${json(ui.rootSelector)});
    const canvas = document.querySelector(${json(ui.canvasSelector)});
    if (!root) failures.push('Root element is missing.');
    if (!canvas) failures.push('Canvas element is missing.');
    const overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    if (overflow > ${quality.ui.maximumHorizontalOverflowPx}) {
      failures.push('Horizontal overflow: ' + overflow + 'px.');
    }
    const buttons = [...document.querySelectorAll(${json(ui.touchTargetSelector)})]
      .filter((element) => element.offsetParent !== null)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute('aria-label') || element.textContent?.trim() || 'button',
          width: rect.width,
          height: rect.height
        };
      });
    for (const button of buttons) {
      if (button.width < ${quality.ui.minimumTouchTargetPx} || button.height < ${quality.ui.minimumTouchTargetPx}) {
        failures.push('Touch target too small: ' + button.label + ' ' + button.width + '×' + button.height + '.');
      }
    }
    const critical = ${json(ui.criticalSelectors)}.map((selector) => {
      const element = document.querySelector(selector);
      if (!element || element.offsetParent === null) return { selector, visible: false, rect: null };
      const rect = element.getBoundingClientRect();
      if (rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1) {
        failures.push('Critical element clipped: ' + selector + '.');
      }
      return {
        selector,
        visible: true,
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }
      };
    });
    for (let left = 0; left < critical.length; left += 1) {
      for (let right = left + 1; right < critical.length; right += 1) {
        const a = critical[left];
        const b = critical[right];
        if (!a.rect || !b.rect) continue;
        const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        if (width * height > ${quality.ui.maximumCriticalOverlapPx}) {
          failures.push('Critical overlap: ' + a.selector + ' with ' + b.selector + '.');
        }
      }
    }
    const canvasRect = canvas?.getBoundingClientRect();
    const canvasShare = canvasRect
      ? (canvasRect.width * canvasRect.height) / (innerWidth * innerHeight)
      : 0;
    if (canvasShare < ${quality.ui.minimumCanvasViewportShare}) {
      failures.push('Canvas viewport share too small: ' + canvasShare.toFixed(3) + '.');
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow,
      buttons,
      critical,
      canvasShare,
      failures
    };
  })()`;
}

export async function probeCanvasInteraction(cdp, ui) {
  const baseline = await readInteractionState(cdp, ui, true);
  if (!baseline.rect) {
    return { triggered: false, reason: 'Canvas rectangle unavailable.' };
  }
  const positions = [0.25, 0.38, 0.5, 0.62, 0.75];
  for (const yRatio of positions) {
    for (const xRatio of positions) {
      const x = baseline.rect.left + baseline.rect.width * xRatio;
      const y = baseline.rect.top + baseline.rect.height * yRatio;
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x, y, button: 'left', clickCount: 1,
      });
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x, y, button: 'left', clickCount: 1,
      });
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await delay(60);
        const current = await readInteractionState(cdp, ui, false);
        if (
          current.busy
          || current.score !== baseline.score
          || current.message !== baseline.message
          || current.target !== baseline.target
        ) {
          return { triggered: true, x, y, baseline, current };
        }
      }
    }
  }
  return { triggered: false, baseline };
}

export async function clickSelector(cdp, selector) {
  return evaluate(cdp, `(() => {
    const element = document.querySelector(${json(selector)});
    if (!(element instanceof HTMLButtonElement) || element.disabled) return false;
    element.click();
    return true;
  })()`);
}

export function withQualityQuery(base, query, viewportId) {
  const url = new URL(base);
  for (const [key, value] of new URLSearchParams(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('viewport', viewportId);
  return url.toString();
}

async function readInteractionState(cdp, ui, includeRect) {
  return evaluate(cdp, `(() => {
    const canvas = document.querySelector(${json(ui.canvasSelector)});
    const root = document.querySelector(${json(ui.rootSelector)});
    const rect = ${includeRect ? 'canvas?.getBoundingClientRect()' : 'null'};
    return {
      rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
      score: document.querySelector(${json(ui.interaction.scoreSelector)})?.textContent ?? '',
      message: document.querySelector(${json(ui.interaction.messageSelector)})?.textContent ?? '',
      target: document.querySelector(${json(ui.interaction.targetSelector)})?.textContent ?? '',
      busy: root?.classList.contains('is-busy') ?? false
    };
  })()`);
}

function json(value) {
  return JSON.stringify(value);
}
