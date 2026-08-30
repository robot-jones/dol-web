const publishNftMetadataMock = vi.fn();
const submitNftMetadataUpdateMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dapp", () => ({
  publishNftMetadata: (...a: unknown[]) => publishNftMetadataMock(...a),
  submitNftMetadataUpdate: (...a: unknown[]) => submitNftMetadataUpdateMock(...a),
}));

const unpinFileMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/blockchain", () => ({
  unpinFile: (...a: unknown[]) => unpinFileMock(...a),
}));

const getPerformanceMock = vi.fn();
const setPublishedCidsMock = vi.fn();
const updateClaimedAttributesMock = vi.fn();
const getAccountMock = vi.fn();
const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getPerformance: (...a: unknown[]) => getPerformanceMock(...a),
  setPublishedCids: (...a: unknown[]) => setPublishedCidsMock(...a),
  updateClaimedAttributes: (...a: unknown[]) => updateClaimedAttributesMock(...a),
  getAccount: (...a: unknown[]) => getAccountMock(...a),
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
}));

process.env.NEXT_PUBLIC_HFB_COLLECTION_ID = "0.0.token";

import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = (body: unknown) => ({ json: async () => body }) as any;

const call = async (accountId: string, showDate: string, position: string, body: unknown = { song: "Test" }) =>
  POST(makeRequest(body), {
    params: Promise.resolve({ accountId, showDate, position }),
  });

describe("/api/mint/[accountId]/[showDate]/[position]/update POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPerformanceMock.mockResolvedValue({
      lockedBy: "0.0.1",
      lockedSerial: 7,
      imageCid: "bafy-old-img",
      metadataCid: "bafy-old-json",
    });
    publishNftMetadataMock.mockResolvedValue({ imageCid: "bafy-new-img", metadataCid: "bafy-new-json" });
    setPublishedCidsMock.mockResolvedValue({ success: true });
    updateClaimedAttributesMock.mockResolvedValue({ success: true });
    submitNftMetadataUpdateMock.mockResolvedValue(true);
    unpinFileMock.mockResolvedValue(true);
    getAccountMock.mockResolvedValue(undefined);
    getAppConfigMock.mockResolvedValue({ mintEnabled: true });
  });

  it("re-publishes against the already-claimed serial and reports success", async () => {
    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ success: true });
    expect(publishNftMetadataMock).toHaveBeenCalledWith(
      "0.0.token",
      7,
      "1998-07-29",
      1,
      "0.0.1",
      expect.objectContaining({ song: "Test" })
    );
  });

  it("submits the on-chain metadata update using the newly published CID", async () => {
    await call("0.0.1", "1998-07-29", "1");
    expect(submitNftMetadataUpdateMock).toHaveBeenCalledWith(
      "0.0.token",
      7,
      "bafy-new-json",
      "1998-07-29",
      1,
      "0.0.1",
      undefined,
      undefined
    );
  });

  it("persists the new attributes without ever calling claimPerformance or touching lockedAt", async () => {
    await call("0.0.1", "1998-07-29", "1");
    expect(updateClaimedAttributesMock).toHaveBeenCalledWith(
      "1998-07-29",
      1,
      "0.0.1",
      expect.objectContaining({ song: "Test" })
    );
  });

  it("unpins the superseded old CIDs once everything succeeds", async () => {
    await call("0.0.1", "1998-07-29", "1");
    expect(unpinFileMock).toHaveBeenCalledWith("bafy-old-img");
    expect(unpinFileMock).toHaveBeenCalledWith("bafy-old-json");
    expect(unpinFileMock).not.toHaveBeenCalledWith("bafy-new-img");
    expect(unpinFileMock).not.toHaveBeenCalledWith("bafy-new-json");
  });

  it("reports NOT_LOCKED and does no work when the account no longer holds the lock", async () => {
    getPerformanceMock.mockResolvedValue({ lockedBy: "0.0.2", lockedSerial: 7 });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "NOT_LOCKED" });
    expect(publishNftMetadataMock).not.toHaveBeenCalled();
  });

  it("reports NOT_LOCKED when the performance is already sold", async () => {
    getPerformanceMock.mockResolvedValue({ lockedBy: "0.0.1", lockedSerial: 7, serial: 7 });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "NOT_LOCKED" });
    expect(publishNftMetadataMock).not.toHaveBeenCalled();
  });

  it("reports NOT_LOCKED when there's no performance record at all", async () => {
    getPerformanceMock.mockResolvedValue(undefined);

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "NOT_LOCKED" });
  });

  it("unpins a lone published image and reports METADATA_PUBLISH_FAILED when publishing only half-completes", async () => {
    publishNftMetadataMock.mockResolvedValue({ imageCid: "bafy-new-img" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "METADATA_PUBLISH_FAILED" });
    expect(unpinFileMock).toHaveBeenCalledWith("bafy-new-img");
    expect(updateClaimedAttributesMock).not.toHaveBeenCalled();
  });

  it("reports METADATA_PUBLISH_FAILED when nothing published at all, without touching Dynamo", async () => {
    publishNftMetadataMock.mockResolvedValue({});

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "METADATA_PUBLISH_FAILED" });
    expect(unpinFileMock).not.toHaveBeenCalled();
    expect(updateClaimedAttributesMock).not.toHaveBeenCalled();
  });

  it("unpins the newly published CIDs and reports NOT_LOCKED when the claim moved on before the Dynamo write", async () => {
    updateClaimedAttributesMock.mockResolvedValue({ success: false, reason: "ConditionalCheckFailedException" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "NOT_LOCKED" });
    expect(unpinFileMock).toHaveBeenCalledWith("bafy-new-img");
    expect(unpinFileMock).toHaveBeenCalledWith("bafy-new-json");
    expect(setPublishedCidsMock).not.toHaveBeenCalled();
  });

  it("reports METADATA_PUBLISH_FAILED, having already persisted the new attributes+CIDs, when the on-chain submit fails", async () => {
    submitNftMetadataUpdateMock.mockResolvedValue(false);

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: false, reason: "METADATA_PUBLISH_FAILED" });
    expect(updateClaimedAttributesMock).toHaveBeenCalled();
    expect(setPublishedCidsMock).toHaveBeenCalled();
    // Old CIDs aren't unpinned on this path - the new metadata never went
    // live on-chain, so the old CIDs are still what's actually referenced.
    expect(unpinFileMock).not.toHaveBeenCalledWith("bafy-old-img");
    expect(unpinFileMock).not.toHaveBeenCalledWith("bafy-old-json");
  });

  it("still reports success even if persisting the new CIDs itself fails - the on-chain update already succeeded", async () => {
    setPublishedCidsMock.mockResolvedValue({ success: false, reason: "ConditionalCheckFailedException" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data).toEqual({ success: true });
  });

  it("passes a provided inscription through to the on-chain metadata update", async () => {
    await call("0.0.1", "1998-07-29", "1", { song: "Test", inscription: "for jenny" });
    expect(submitNftMetadataUpdateMock).toHaveBeenCalledWith(
      "0.0.token",
      7,
      "bafy-new-json",
      "1998-07-29",
      1,
      "0.0.1",
      undefined,
      "for jenny"
    );
  });

  it("trims a whitespace-only inscription down to undefined rather than storing blank text", async () => {
    await call("0.0.1", "1998-07-29", "1", { song: "Test", inscription: "   " });
    expect(submitNftMetadataUpdateMock).toHaveBeenCalledWith(
      "0.0.token",
      7,
      "bafy-new-json",
      "1998-07-29",
      1,
      "0.0.1",
      undefined,
      undefined
    );
  });

  it("rejects an inscription over the character limit before doing any work", async () => {
    const res = await call("0.0.1", "1998-07-29", "1", { song: "Test", inscription: "x".repeat(101) });
    expect(res.status).toBe(400);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects a non-string inscription", async () => {
    const res = await call("0.0.1", "1998-07-29", "1", { song: "Test", inscription: 12345 });
    expect(res.status).toBe(400);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects a blocked account even though minting is globally enabled", async () => {
    getAccountMock.mockResolvedValue({ blocked: true });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects an unlisted account while the soft switch is paused", async () => {
    getAppConfigMock.mockResolvedValue({ mintEnabled: false });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });
});
