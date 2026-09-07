import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSavedWorkspaceView,
  getSavedWorkspaceView,
  setSavedWorkspaceView
} from '../src/storage/uiWorkspaceView';

describe('uiWorkspaceView storage helper', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing is saved', () => {
    expect(getSavedWorkspaceView()).toBeNull();
  });

  it('saves and retrieves valid workspace views', () => {
    setSavedWorkspaceView('hub');
    expect(getSavedWorkspaceView()).toBe('hub');

    setSavedWorkspaceView('application');
    expect(getSavedWorkspaceView()).toBe('application');

    setSavedWorkspaceView('route-selection');
    expect(getSavedWorkspaceView()).toBe('route-selection');
  });

  it('clears saved workspace view', () => {
    setSavedWorkspaceView('hub');
    expect(getSavedWorkspaceView()).toBe('hub');

    clearSavedWorkspaceView();
    expect(getSavedWorkspaceView()).toBeNull();
  });

  it('ignores invalid values in localStorage', () => {
    window.localStorage.setItem('nzVisaPrepChecklist.ui.workspaceView', 'invalid-view');
    expect(getSavedWorkspaceView()).toBeNull();
  });
});
