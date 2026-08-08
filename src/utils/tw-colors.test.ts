import { getTwDolColor, TwColorClassPrefix } from "./tw-colors";
import { DolColor } from "@erikmuir/dol-lib/types";

const colors: DolColor[] = ["blue", "green", "red", "yellow", "dark", "light"];

describe("getTwDolColor", () => {
  test("text prefix, default percentage", () => {
    for (const color of colors) {
      expect(getTwDolColor(color, TwColorClassPrefix.Text)).toBe(`text-dol-${color}`);
    }
  });

  test("border prefix, default and 25%", () => {
    for (const color of colors) {
      expect(getTwDolColor(color, TwColorClassPrefix.Border)).toBe(`border-dol-${color}`);
      expect(getTwDolColor(color, TwColorClassPrefix.Border, 25)).toBe(`border-dol-${color}/25`);
    }
  });

  test("background prefix at every percentage actually used", () => {
    for (const color of colors) {
      expect(getTwDolColor(color, TwColorClassPrefix.Background)).toBe(`bg-dol-${color}`);
      expect(getTwDolColor(color, TwColorClassPrefix.Background, 50)).toBe(`bg-dol-${color}/50`);
      expect(getTwDolColor(color, TwColorClassPrefix.Background, 25)).toBe(`bg-dol-${color}/25`);
      expect(getTwDolColor(color, TwColorClassPrefix.Background, 10)).toBe(`bg-dol-${color}/10`);
    }
  });

  test("webkit media-controls variant, background only", () => {
    for (const color of colors) {
      expect(getTwDolColor(color, TwColorClassPrefix.Background, 100, "[&::-webkit-media-controls-panel]")).toBe(
        `[&::-webkit-media-controls-panel]:bg-dol-${color}`
      );
      expect(getTwDolColor(color, TwColorClassPrefix.Background, 50, "[&::-webkit-media-controls-panel]")).toBe(
        `[&::-webkit-media-controls-panel]:bg-dol-${color}/50`
      );
    }
  });

  test("throws for an unregistered combination instead of silently returning nothing", () => {
    expect(() => getTwDolColor("blue", TwColorClassPrefix.Border, 50)).toThrow(/no class registered/);
    expect(() =>
      getTwDolColor("blue", TwColorClassPrefix.Text, 100, "[&::-webkit-media-controls-panel]")
    ).toThrow(/no class registered/);
  });
});
