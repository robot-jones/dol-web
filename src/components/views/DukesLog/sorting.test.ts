import { MintedPerformance } from "@erikmuir/dol-lib/types";
import { compareMintedPerformances, matchesSearch } from "./sorting";

const performance = (overrides: Partial<MintedPerformance>): MintedPerformance => ({
  showDate: "2024-03-22",
  position: 1,
  performanceId: "20240322:1",
  serial: 5,
  lockedBy: "0.0.1234",
  song: "Chalk Dust Torture",
  venue: "Madison Square Garden",
  ...overrides,
});

describe("matchesSearch", () => {
  it("matches on song, date, venue, account, or serial, case-insensitively", () => {
    const p = performance({});
    expect(matchesSearch(p, "chalk dust")).toBe(true);
    expect(matchesSearch(p, "2024-03-22")).toBe(true);
    expect(matchesSearch(p, "madison")).toBe(true);
    expect(matchesSearch(p, "0.0.1234")).toBe(true);
    expect(matchesSearch(p, "5")).toBe(true);
    expect(matchesSearch(p, "divided sky")).toBe(false);
  });

  it("treats a blank search term as matching everything", () => {
    expect(matchesSearch(performance({}), "  ")).toBe(true);
  });
});

describe("compareMintedPerformances", () => {
  it("sorts by date, keeping same-date performances ordered by position", () => {
    const a = performance({ showDate: "2024-03-22", position: 2 });
    const b = performance({ showDate: "2024-03-22", position: 1 });
    const c = performance({ showDate: "2024-03-21", position: 1 });
    const sorted = [a, b, c].sort(compareMintedPerformances("date", "asc"));
    expect(sorted).toEqual([c, b, a]);
  });

  it("reverses order for descending direction", () => {
    const a = performance({ showDate: "2024-03-21" });
    const b = performance({ showDate: "2024-03-22" });
    const sorted = [a, b].sort(compareMintedPerformances("date", "desc"));
    expect(sorted).toEqual([b, a]);
  });

  it("sorts by song alphabetically", () => {
    const a = performance({ song: "You Enjoy Myself" });
    const b = performance({ song: "Divided Sky" });
    const sorted = [a, b].sort(compareMintedPerformances("song", "asc"));
    expect(sorted).toEqual([b, a]);
  });

  it("sorts by serial numerically", () => {
    const a = performance({ serial: 20 });
    const b = performance({ serial: 3 });
    const sorted = [a, b].sort(compareMintedPerformances("serial", "asc"));
    expect(sorted).toEqual([b, a]);
  });

  it("sorts by account id", () => {
    const a = performance({ lockedBy: "0.0.999" });
    const b = performance({ lockedBy: "0.0.100" });
    const sorted = [a, b].sort(compareMintedPerformances("account", "asc"));
    expect(sorted).toEqual([b, a]);
  });

  it("sorts by mintedAt, treating an unknown timestamp as earliest", () => {
    const a = performance({ mintedAt: 2000 });
    const b = performance({ mintedAt: undefined });
    const c = performance({ mintedAt: 1000 });
    const sorted = [a, b, c].sort(compareMintedPerformances("mintedAt", "asc"));
    expect(sorted).toEqual([b, c, a]);
  });
});
