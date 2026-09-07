import { UI_ACTIVE_APPLICATION_KEY } from './config';

export function getSavedActiveApplicationId(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(UI_ACTIVE_APPLICATION_KEY);
    return raw && typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setSavedActiveApplicationId(applicationId: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!applicationId || typeof applicationId !== 'string') return;
    const trimmed = applicationId.trim();
    if (!trimmed) return;
    window.localStorage.setItem(UI_ACTIVE_APPLICATION_KEY, trimmed);
  } catch {}
}

export function clearSavedActiveApplicationId(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(UI_ACTIVE_APPLICATION_KEY);
  } catch {}
}
