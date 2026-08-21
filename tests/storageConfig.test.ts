import { describe, expect, it } from 'vitest';
import { DB_NAME, UI_SCROLL_PREFIX } from '../src/storage/config';
import { setSavedScrollPosition } from '../src/storage/uiScroll';

describe('storage configuration', () => {
  it('exports expected storage constants', () => {
    expect(typeof DB_NAME).toBe('string');
    expect(DB_NAME.length).toBeGreaterThan(0);
    expect(typeof UI_SCROLL_PREFIX).toBe('string');
    expect(UI_SCROLL_PREFIX.endsWith('.')).toBe(true);
  });

  it('uses UI_SCROLL_PREFIX when writing to localStorage', () => {
    window.localStorage.clear();
    setSavedScrollPosition(120, 'test-project');
    const expectedKey = `${UI_SCROLL_PREFIX}test-project`;
    expect(window.localStorage.getItem(expectedKey)).toBe('120');
  });
});
