import { UI_SURVEY_PAGE_PREFIX } from './config';

export function getSavedSurveyPage(projectId = 'default'): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(`${UI_SURVEY_PAGE_PREFIX}${projectId}`);
    return raw && typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setSavedSurveyPage(pageName: string, projectId = 'default'): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!pageName || typeof pageName !== 'string') return;
    const trimmed = pageName.trim();
    if (!trimmed) return;
    window.localStorage.setItem(`${UI_SURVEY_PAGE_PREFIX}${projectId}`, trimmed);
  } catch {}
}

export function clearSavedSurveyPage(projectId = 'default'): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(`${UI_SURVEY_PAGE_PREFIX}${projectId}`);
  } catch {}
}
