const getSetlistsByShowDateMock = vi.fn();
const getSetlistsBySongMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/api", () => ({
  getSetlistsByShowDate: (...a: unknown[]) => getSetlistsByShowDateMock(...a),
  getSetlistsBySong: (...a: unknown[]) => getSetlistsBySongMock(...a),
}));

import { GET } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (dateOrSlug: string) => GET({} as any, { params: Promise.resolve({ dateOrSlug }) });

describe("/api/setlists/[dateOrSlug] GET", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // Same reasoning as recency.test.ts - reproduce Vercel's UTC runtime,
    // not whatever TZ this happens to run under locally/in CI.
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getSetlistsByShowDateMock.mockResolvedValue([{ artistId: 1, song: "Tweezer" }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Regression test for the 2026-09-04 launch-night incident (see
  // recency.test.ts) - this route only stayed live during the show
  // because of this call, so the wiring itself needs its own coverage,
  // not just the isShowDay helper in isolation.
  it("skips the cache for today's show even just after the UTC day rolls over at door time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:01Z")); // 7:00:01 PM CDT
    await call("2026-09-04");
    expect(getSetlistsByShowDateMock).toHaveBeenCalledWith("2026-09-04", {}, true);
  });

  it("stays cache-first for a date well in the past", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:01Z"));
    await call("1994-07-08");
    expect(getSetlistsByShowDateMock).toHaveBeenCalledWith("1994-07-08", {}, false);
  });

  it("stays cache-first for a date well in the future", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:01Z"));
    await call("2026-12-31");
    expect(getSetlistsByShowDateMock).toHaveBeenCalledWith("2026-12-31", {}, false);
  });

  it("routes a non-date slug to getSetlistsBySong, always cache-first", async () => {
    getSetlistsBySongMock.mockResolvedValueOnce([{ artistId: 1, song: "Tweezer" }]);
    await call("tweezer");
    expect(getSetlistsBySongMock).toHaveBeenCalledWith("tweezer", {}, false);
    expect(getSetlistsByShowDateMock).not.toHaveBeenCalled();
  });

  it("filters out non-Phish artist rows", async () => {
    getSetlistsByShowDateMock.mockResolvedValueOnce([
      { artistId: 1, song: "Tweezer" },
      { artistId: 2, song: "Some Cover" },
    ]);
    const res = await call("2026-09-04");
    const body = await res.json();
    expect(body.data).toEqual([{ artistId: 1, song: "Tweezer" }]);
  });
});
