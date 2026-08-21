import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSavedScrollPosition,
  getSavedScrollPosition,
  setSavedScrollPosition
} from "../src/storage/uiScroll";

describe('uiScroll storage helper', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no position is stored", () => {
    expect(getSavedScrollPosition("test-proj")).toBeNull();
  });

  it("saves and retrieves a valid scroll position", () => {
    setSavedScrollPosition(345.6, "test-proj");
    expect(getSavedScrollPosition("test-proj")).toBe(346);
  });

  it("clears the saved scroll position", () => {
    setSavedScrollPosition(200, "test-proj");
    clearSavedScrollPosition("test-proj");
    expect(getSavedScrollPosition("test-proj")).toBeNull();
  });

  it("handles non-negative numbers gracefully", () => {
    setSavedScrollPosition(-50, "test-proj");
    expect(getSavedScrollPosition("test-proj")).toBe(0);
  });
});
