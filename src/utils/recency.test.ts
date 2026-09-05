import { isRecentShow, isShowDay } from "./recency";

describe("isRecentShow", () => {
  it("is true for a show within the last year", () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(isRecentShow(recent)).toBe(true);
  });

  it("is false for a show over a year old", () => {
    expect(isRecentShow("1994-07-08")).toBe(false);
  });

  it("is false for undefined/invalid input", () => {
    expect(isRecentShow(undefined)).toBe(false);
    expect(isRecentShow("not-a-date")).toBe(false);
  });
});

describe("isShowDay", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // Reproduce Vercel's actual runtime, where there's no TZ configured
    // anywhere in this repo and Node defaults to UTC - the exact condition
    // that caused this bug. Running this suite under a machine/CI TZ that
    // happens to be US-local would let a regression slip back in silently.
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Regression test for the 2026-09-04 launch-night incident: a US show's
  // local calendar date trails UTC's by up to ~8h, so the server's day
  // rolls over to the *next* date mid-show - for a 7PM Central show, right
  // at door time. A strict daysUntil(date) === 0 check went false at that
  // exact moment, silently re-enabling the 12h setlist cache with an empty
  // result cached from before the first song was announced.
  it("is still true for the show date just after the UTC day rolls over (7PM Central door time)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:01Z")); // 7:00:01 PM CDT, moments after doors
    expect(isShowDay("2026-09-04")).toBe(true);
  });

  it("is true for the show's actual UTC calendar date too", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T23:00:00Z")); // 6:00 PM CDT, before doors
    expect(isShowDay("2026-09-04")).toBe(true);
  });

  it("is false more than a day out on either side", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T04:21:00Z"));
    expect(isShowDay("2026-09-03")).toBe(false);
    expect(isShowDay("2026-09-06")).toBe(false);
  });

  it("is false for undefined input", () => {
    expect(isShowDay(undefined)).toBe(false);
  });
});
