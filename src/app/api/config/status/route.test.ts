process.env.NEXT_PUBLIC_HFB_COLLECTION_ID = "0.0.token";

const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
}));

const getTokenInfoMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/api", () => ({
  getMirrorClient: () => ({ getTokenInfo: (...a: unknown[]) => getTokenInfoMock(...a) }),
}));

import { GET } from "./route";

describe("/api/config/status GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTokenInfoMock.mockResolvedValue({ total_supply: "0", max_supply: "555" });
  });

  it("fails closed (mintEnabled false, PRE) when no config row exists yet", async () => {
    getAppConfigMock.mockResolvedValueOnce(undefined);
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: false, collectionMintStatus: "PRE" });
  });

  it("reflects mintEnabled true as ACTIVE", async () => {
    getAppConfigMock.mockResolvedValueOnce({ id: "global", mintEnabled: true, launchedAt: 1700000000000 });
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: true, collectionMintStatus: "ACTIVE" });
  });

  it("reflects a paused (mintEnabled false, already launched) config row as PAUSED", async () => {
    getAppConfigMock.mockResolvedValueOnce({
      id: "global",
      mintEnabled: false,
      pausedReason: "investigating",
      launchedAt: 1700000000000,
    });
    getTokenInfoMock.mockResolvedValueOnce({ total_supply: "1", max_supply: "555" });
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: false, collectionMintStatus: "PAUSED" });
  });

  it("reflects an ended config row as ENDED, even if mintEnabled was somehow left true", async () => {
    getAppConfigMock.mockResolvedValueOnce({
      id: "global",
      mintEnabled: true,
      launchedAt: 1700000000000,
      endedAt: 1700000001000,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: true, collectionMintStatus: "ENDED" });
  });

  it("reflects a sold-out collection as SOLD_OUT, regardless of mintEnabled/endedAt", async () => {
    getAppConfigMock.mockResolvedValueOnce({ id: "global", mintEnabled: true, launchedAt: 1700000000000 });
    getTokenInfoMock.mockResolvedValueOnce({ total_supply: "555", max_supply: "555" });
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: true, collectionMintStatus: "SOLD_OUT" });
  });
});
