import { beforeEach, describe, expect, it } from 'vitest';
import { clearSavedSurveyPage, getSavedSurveyPage, setSavedSurveyPage } from '../src/storage/uiSurveyPage';

describe('uiSurveyPage storage helper', () => {
  beforeEach(() => {
    clearSavedSurveyPage('app-1');
    clearSavedSurveyPage('app-2');
    clearSavedSurveyPage('default');
  });

  it('returns null when no survey page has been saved', () => {
    expect(getSavedSurveyPage('app-1')).toBeNull();
  });

  it('saves and retrieves survey page name by projectId', () => {
    setSavedSurveyPage('course-and-tuition', 'app-1');
    setSavedSurveyPage('funding', 'app-2');

    expect(getSavedSurveyPage('app-1')).toBe('course-and-tuition');
    expect(getSavedSurveyPage('app-2')).toBe('funding');
  });

  it('clears stored survey page for specific project without affecting others', () => {
    setSavedSurveyPage('course-and-tuition', 'app-1');
    setSavedSurveyPage('funding', 'app-2');

    clearSavedSurveyPage('app-1');

    expect(getSavedSurveyPage('app-1')).toBeNull();
    expect(getSavedSurveyPage('app-2')).toBe('funding');
  });

  it('handles empty or whitespace strings safely', () => {
    setSavedSurveyPage('  ', 'app-1');
    expect(getSavedSurveyPage('app-1')).toBeNull();
  });
});
