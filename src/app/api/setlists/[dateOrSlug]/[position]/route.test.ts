const getSetlistsByShowDateMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/api", () => ({
  getSetlistsByShowDate: (...a: unknown[]) => getSetlistsByShowDateMock(...a),
}));

import { GET } from "./route";

const call = (dateOrSlug: string, position: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GET({} as any, { params: Promise.resolve({ dateOrSlug, position }) });

describe("/api/setlists/[dateOrSlug]/[position] GET", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getSetlistsByShowDateMock.mockResolvedValue([
      { showDate: "2026-09-04", position: 1, artistId: 1, song: "Tweezer" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Regression test for the 2026-09-04 launch-night incident (see
  // recency.test.ts) - this is the route the mint page's canMint check
  // reads from, so a stale/empty cache here doesn't just hide a setlist,
  // it blocks minting a newly-played song too.
  it("skips the cache for today's show even just after the UTC day rolls over at door time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:01Z")); // 7:00:01 PM CDT
    await call("2026-09-04", "1");
    expect(getSetlistsByShowDateMock).toHaveBeenCalledWith("2026-09-04", {}, true);
  });

  it("stays cache-first for a past show", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:01Z"));
    await call("1994-07-08", "1");
    expect(getSetlistsByShowDateMock).toHaveBeenCalledWith("1994-07-08", {}, false);
  });

  it("returns the matching position's setlist row", async () => {
    const res = await call("2026-09-04", "1");
    const body = await res.json();
    expect(body.data).toEqual({ showDate: "2026-09-04", position: 1, artistId: 1, song: "Tweezer" });
  });

  it("returns undefined for an invalid date", async () => {
    const res = await call("not-a-date", "1");
    const body = await res.json();
    expect(body.data).toBeUndefined();
    expect(getSetlistsByShowDateMock).not.toHaveBeenCalled();
  });
});
