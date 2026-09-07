import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSavedActiveApplicationId,
  getSavedActiveApplicationId,
  setSavedActiveApplicationId
} from '../src/storage/uiActiveApplication';
import { UI_ACTIVE_APPLICATION_KEY } from '../src/storage/config';

describe('uiActiveApplication storage helper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no active application is saved', () => {
    expect(getSavedActiveApplicationId()).toBeNull();
  });

  it('saves and reads active application ID successfully', () => {
    setSavedActiveApplicationId('app-alice-student');
    expect(getSavedActiveApplicationId()).toBe('app-alice-student');
    expect(localStorage.getItem(UI_ACTIVE_APPLICATION_KEY)).toBe('app-alice-student');
  });

  it('trims whitespace and ignores empty or invalid inputs', () => {
    setSavedActiveApplicationId('  app-bob-visitor  ');
    expect(getSavedActiveApplicationId()).toBe('app-bob-visitor');

    setSavedActiveApplicationId('   ');
    expect(getSavedActiveApplicationId()).toBe('app-bob-visitor');
  });

  it('clears saved active application ID successfully', () => {
    setSavedActiveApplicationId('app-alice-student');
    expect(getSavedActiveApplicationId()).toBe('app-alice-student');

    clearSavedActiveApplicationId();
    expect(getSavedActiveApplicationId()).toBeNull();
    expect(localStorage.getItem(UI_ACTIVE_APPLICATION_KEY)).toBeNull();
  });
});
