process.env.NEXT_PUBLIC_HFB_COLLECTION_ID = "0.0.token";
process.env.NEXT_PUBLIC_TREASURY_ACCOUNT = "0.0.treasury";

const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
}));

const getTokenBalanceMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/api", () => ({
  getMirrorClient: () => ({ getTokenBalance: (...a: unknown[]) => getTokenBalanceMock(...a) }),
}));

import { GET } from "./route";

describe("/api/config/status GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTokenBalanceMock.mockResolvedValue(555);
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
    getTokenBalanceMock.mockResolvedValueOnce(554);
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

  // Regression test: this used to be driven by on-chain total_supply/
  // max_supply, which are equal from the moment the collection is
  // pre-minted - long before any real sale - so this branch fired
  // permanently, site-wide, well before it should have. Now driven by the
  // treasury's actual remaining balance instead.
  it("reflects a sold-out collection (treasury balance 0) as SOLD_OUT, regardless of mintEnabled/endedAt", async () => {
    getAppConfigMock.mockResolvedValueOnce({ id: "global", mintEnabled: true, launchedAt: 1700000000000 });
    getTokenBalanceMock.mockResolvedValueOnce(0);
    const res = await GET();
    const body = await res.json();
    expect(body.data).toEqual({ mintEnabled: true, collectionMintStatus: "SOLD_OUT" });
  });

  it("does not report SOLD_OUT just because the pre-mint has already put every serial on-chain - only an empty treasury counts", async () => {
    getAppConfigMock.mockResolvedValueOnce({ id: "global", mintEnabled: true, launchedAt: 1700000000000 });
    getTokenBalanceMock.mockResolvedValueOnce(554); // one sold, 554 left - not sold out
    const res = await GET();
    const body = await res.json();
    expect(body.data.collectionMintStatus).toBe("ACTIVE");
  });
});
