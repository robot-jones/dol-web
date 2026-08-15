const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
}));

import { GET } from "./route";

describe("/api/config/status GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed (mintEnabled false) when no config row exists yet", async () => {
    getAppConfigMock.mockResolvedValueOnce(undefined);
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: false });
  });

  it("reflects mintEnabled true", async () => {
    getAppConfigMock.mockResolvedValueOnce({ id: "global", mintEnabled: true });
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: true });
  });

  it("reflects a paused (mintEnabled false) config row", async () => {
    getAppConfigMock.mockResolvedValueOnce({ id: "global", mintEnabled: false, pausedReason: "investigating" });
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: false });
  });
});
