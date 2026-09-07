import { UI_WORKSPACE_VIEW_KEY } from './config';

export type SavedWorkspaceView = 'application' | 'hub' | 'route-selection';

export function getSavedWorkspaceView(): SavedWorkspaceView | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(UI_WORKSPACE_VIEW_KEY);
    if (raw === 'application' || raw === 'hub' || raw === 'route-selection') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSavedWorkspaceView(view: SavedWorkspaceView): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (view === 'application' || view === 'hub' || view === 'route-selection') {
      window.localStorage.setItem(UI_WORKSPACE_VIEW_KEY, view);
    }
  } catch {}
}

export function clearSavedWorkspaceView(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(UI_WORKSPACE_VIEW_KEY);
  } catch {}
}
