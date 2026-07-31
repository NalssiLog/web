import { describe, expect, it } from "vitest";
import {
  getWeatherStatusTone,
  weatherStatusToneClasses,
} from "@/lib/weather-status-tone";

describe("weather status tones", () => {
  it("maps low-intensity statuses to blue", () => {
    for (const status of ["COLD", "NONE", "LOW"] as const) {
      expect(getWeatherStatusTone(status)).toBe(weatherStatusToneClasses.BLUE);
    }
  });

  it("maps middle-intensity statuses to green", () => {
    for (const status of ["FRESH", "LIGHT", "MODERATE"] as const) {
      expect(getWeatherStatusTone(status)).toBe(weatherStatusToneClasses.GREEN);
    }
  });

  it("maps high-intensity statuses to orange", () => {
    for (const status of ["HOT", "HEAVY", "STRONG"] as const) {
      expect(getWeatherStatusTone(status)).toBe(weatherStatusToneClasses.ORANGE);
    }
  });
});
