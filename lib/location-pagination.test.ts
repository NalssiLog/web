import { describe, expect, it } from "vitest";
import {
  clampLocationPage,
  getLocationPageCount,
  getLocationPageItems,
} from "@/lib/location-pagination";

describe("location pagination", () => {
  it("splits location results into five-item pages", () => {
    const locations = Array.from({ length: 12 }, (_, index) => index + 1);

    expect(getLocationPageCount(locations.length)).toBe(3);
    expect(getLocationPageItems(locations, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(getLocationPageItems(locations, 3)).toEqual([11, 12]);
  });

  it("clamps a page when items are removed", () => {
    expect(clampLocationPage(3, 10)).toBe(2);
    expect(getLocationPageItems([1, 2, 3], 4)).toEqual([1, 2, 3]);
  });

  it("keeps empty results on page one", () => {
    expect(getLocationPageCount(0)).toBe(1);
    expect(clampLocationPage(2, 0)).toBe(1);
    expect(getLocationPageItems([], 1)).toEqual([]);
  });
});
