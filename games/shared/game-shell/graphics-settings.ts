export const graphicsPreferences = ['auto', 'high', 'balanced', 'low'] as const;
export type GraphicsPreference = typeof graphicsPreferences[number];
export interface GraphicsSettings {
  readonly quality: GraphicsPreference;
  readonly autoZoom: boolean;
  readonly reducedMotion: boolean;
}
export const graphicsDefaults: GraphicsSettings = { quality: 'auto', autoZoom: true, reducedMotion: false };
export const graphicsStorageKey = 'slop.graphics.v1';
export const graphicsPixelRatio = { high: 2, balanced: 1.25, low: 0.85 } as const;

export function normalizeGraphics(value: unknown): GraphicsSettings {
  const record = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  return { quality: graphicsPreferences.includes(record.quality as GraphicsPreference)
    ? record.quality as GraphicsPreference : graphicsDefaults.quality,
    autoZoom: typeof record.autoZoom === 'boolean' ? record.autoZoom : graphicsDefaults.autoZoom,
    reducedMotion: typeof record.reducedMotion === 'boolean' ? record.reducedMotion : graphicsDefaults.reducedMotion };
}
function read(): GraphicsSettings {
  try { return normalizeGraphics(JSON.parse(localStorage.getItem(graphicsStorageKey) ?? 'null')); }
  catch { return { ...graphicsDefaults }; }
}
let current = read();
const listeners = new Set<(value: GraphicsSettings) => void>();
export const graphicsSettings = {
  get: (): GraphicsSettings => current,
  set(value: Partial<GraphicsSettings>): void {
    current = normalizeGraphics({ ...current, ...value });
    try { localStorage.setItem(graphicsStorageKey, JSON.stringify(current)); } catch { /* Storage may be denied. */ }
    for (const listener of listeners) listener(current);
  },
  subscribe(listener: (value: GraphicsSettings) => void): () => void {
    listeners.add(listener); listener(current);
    return () => { listeners.delete(listener); };
  },
};
export function prefersReducedMotion(): boolean {
  return current.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Structural boundary: no Three import or second renderer. */
export function bindRendererGraphics(renderer: {
  getPixelRatio(): number; setPixelRatio(value: number): void;
  shadowMap: { enabled: boolean; needsUpdate: boolean };
}): () => void {
  const defaultRatio = renderer.getPixelRatio(), defaultShadows = renderer.shadowMap.enabled;
  return graphicsSettings.subscribe(({ quality }) => {
    renderer.setPixelRatio(quality === 'auto' ? defaultRatio : Math.min(devicePixelRatio || 1, graphicsPixelRatio[quality]));
    renderer.shadowMap.enabled = quality === 'auto' ? defaultShadows : quality !== 'low';
    renderer.shadowMap.needsUpdate = true;
  });
}
