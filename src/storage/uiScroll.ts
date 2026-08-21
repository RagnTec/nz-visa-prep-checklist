import { UI_SCROLL_PREFIX } from './config';

export function getSavedScrollPosition(projectId = 'default'): number | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(`${UI_SCROLL_PREFIX}${projectId}`);
    if (!raw) return null;
    const value = parseInt(raw, 10);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function setSavedScrollPosition(top: number, projectId = 'default'): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      `${UI_SCROLL_PREFIX}${projectId}`,
      String(Math.max(0, Math.round(top)))
    );
  } catch {}
}

export function clearSavedScrollPosition(projectId = 'default'): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(`${UI_SCROLL_PREFIX}${projectId}`);
  } catch {}
}
