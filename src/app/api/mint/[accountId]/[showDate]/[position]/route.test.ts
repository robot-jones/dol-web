const claimPerformanceMock = vi.fn();
const publishNftMetadataMock = vi.fn();
const submitNftMetadataUpdateMock = vi.fn();
const releaseClaimMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dapp", () => ({
  claimPerformance: (...a: unknown[]) => claimPerformanceMock(...a),
  publishNftMetadata: (...a: unknown[]) => publishNftMetadataMock(...a),
  submitNftMetadataUpdate: (...a: unknown[]) => submitNftMetadataUpdateMock(...a),
  releaseClaim: (...a: unknown[]) => releaseClaimMock(...a),
}));

const setPublishedCidsMock = vi.fn();
const setImageCidMock = vi.fn();
const confirmMetadataOnChainMock = vi.fn();
const getPerformanceMock = vi.fn();
const getAccountMock = vi.fn();
const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  setPublishedCids: (...a: unknown[]) => setPublishedCidsMock(...a),
  setImageCid: (...a: unknown[]) => setImageCidMock(...a),
  confirmMetadataOnChain: (...a: unknown[]) => confirmMetadataOnChainMock(...a),
  getPerformance: (...a: unknown[]) => getPerformanceMock(...a),
  getAccount: (...a: unknown[]) => getAccountMock(...a),
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
}));

vi.mock("@erikmuir/dol-lib/server/blockchain", () => ({
  getHederaClient: () => ({}),
}));

// A signed transaction whose toBytes() returns real, non-trivial bytes -
// this is the exact value that gets JSON-serialized in the response, so
// the test can assert on its actual wire shape.
const rawBytes = new Uint8Array([10, 245, 1, 42, 242, 1, 0]);
const signedTx = { toBytes: () => rawBytes };
const chainable = {
  addHbarTransfer: vi.fn(function (this: unknown) { return this; }),
  addNftTransfer: vi.fn(function (this: unknown) { return this; }),
  freezeWith: vi.fn(function (this: unknown) { return this; }),
  signWithOperator: vi.fn(async () => signedTx),
};
vi.mock("@hashgraph/sdk", () => ({
  // Both must be constructable (`new Hbar(...)`, `new TransferTransaction()`),
  // not plain arrow function mocks - classes returning a fixed value work
  // for asserting call args without modeling the real fluent API.
  Hbar: class {
    amount: number;
    constructor(amount: number) {
      this.amount = amount;
    }
  },
  TransferTransaction: class {
    constructor() {
      return chainable;
    }
  },
}));

process.env.NEXT_PUBLIC_HFB_HBAR_PRICE = "46";
process.env.NEXT_PUBLIC_TREASURY_ACCOUNT = "0.0.treasury";
process.env.NEXT_PUBLIC_HFB_COLLECTION_ID = "0.0.token";

import { SerialErrorResponse } from "@erikmuir/dol-lib/types";
import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = (body: unknown) => ({ json: async () => body }) as any;

const call = async (accountId: string, showDate: string, position: string) =>
  POST(makeRequest({ song: "Test" }), {
    params: Promise.resolve({ accountId, showDate, position }),
  });

describe("/api/mint/[accountId]/[showDate]/[position] POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimPerformanceMock.mockResolvedValue(7);
    publishNftMetadataMock.mockResolvedValue({ imageCid: "bafy-img-cid", metadataCid: "bafy-cid" });
    setPublishedCidsMock.mockResolvedValue({ success: true });
    setImageCidMock.mockResolvedValue({ success: true });
    confirmMetadataOnChainMock.mockResolvedValue({ success: true });
    submitNftMetadataUpdateMock.mockResolvedValue(true);
    getPerformanceMock.mockResolvedValue({ lockedAt: 1786300000000 });
    getAccountMock.mockResolvedValue(undefined);
    getAppConfigMock.mockResolvedValue({ mintEnabled: true });
  });

  it("returns txBytes as an explicit Buffer-shaped wrapper the client can reconstruct from", async () => {
    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.serial).toBe(7);
    // This is the whole point of the test: JSON.stringify on a raw
    // Uint8Array produces {"0":n,"1":n,...}, not this shape - see
    // PUNCHLIST.md Finding 17. Reconstructing with
    // `new Uint8Array(body.data.txBytes.data)` must round-trip exactly.
    expect(body.data.txBytes).toEqual({ type: "Buffer", data: Array.from(rawBytes) });
    expect(new Uint8Array(body.data.txBytes.data)).toEqual(rawBytes);
  });

  it("includes lockedAt so the client can show the elapsed-lock timer immediately, not just after a reload", async () => {
    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();
    expect(body.data.lockedAt).toBe(1786300000000);
    expect(getPerformanceMock).toHaveBeenCalledWith("1998-07-29", 1);
  });

  it("submits the on-chain metadata update before building the transfer transaction, using the pre-computed CID", async () => {
    await call("0.0.1", "1998-07-29", "1");
    expect(submitNftMetadataUpdateMock).toHaveBeenCalledWith(
      "0.0.token",
      7,
      "bafy-cid",
      "1998-07-29",
      1,
      "0.0.1"
    );
  });

  // See PUNCHLIST.md's metadata-reset-on-release finding: this is the
  // signal releaseClaim uses to know the on-chain call actually succeeded
  // (metadataCid alone isn't enough - it's written beforehand regardless of
  // chain outcome), so an abandoned claim past this point gets its serial
  // reset to the placeholder on release instead of left stale.
  it("confirms the on-chain metadata update once it succeeds, before building the transfer transaction", async () => {
    await call("0.0.1", "1998-07-29", "1");
    expect(confirmMetadataOnChainMock).toHaveBeenCalledWith("1998-07-29", 1, "0.0.1");
  });

  it("does not confirm on-chain metadata when the update itself failed", async () => {
    submitNftMetadataUpdateMock.mockResolvedValue(false);
    await call("0.0.1", "1998-07-29", "1");
    expect(confirmMetadataOnChainMock).not.toHaveBeenCalled();
  });

  it("still builds the transfer transaction even if recording the on-chain confirmation itself fails - the real update already succeeded", async () => {
    confirmMetadataOnChainMock.mockResolvedValue({ success: false, reason: "ConditionalCheckFailedException" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data.serial).toBe(7);
    expect(body.data.txBytes).toBeDefined();
  });

  // See PUNCHLIST.md: this used to run post-transfer, where a failure here
  // couldn't be told apart from "buyer never signed" once the wallet had
  // already executed the transfer. Doing it pre-transfer means a failure
  // here is still a pre-payment failure - release the claim, never build a
  // transaction for the buyer to sign.
  it("releases the claim and reports METADATA_PUBLISH_FAILED, without building a transaction, when the on-chain metadata update fails", async () => {
    submitNftMetadataUpdateMock.mockResolvedValue(false);

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data.serial).toBe(SerialErrorResponse.METADATA_PUBLISH_FAILED);
    expect(body.data.txBytes).toBeUndefined();
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
    expect(chainable.addHbarTransfer).not.toHaveBeenCalled();
  });

  it("releases the claim via releaseClaim when publishNftMetadata gets nothing published at all", async () => {
    publishNftMetadataMock.mockResolvedValue({});

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data.serial).toBe(SerialErrorResponse.METADATA_PUBLISH_FAILED);
    expect(setImageCidMock).not.toHaveBeenCalled();
    expect(setPublishedCidsMock).not.toHaveBeenCalled();
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
  });

  // publishNftMetadata never throws, and always reports whatever it
  // actually published - a lone imageCid (metadata upload failed right
  // after) needs to be persisted on its own, not discarded, so releaseClaim
  // can still find and unpin it. See PUNCHLIST.md Finding 25.
  it("persists a lone imageCid via setImageCid, then releases the claim, when only the image half published", async () => {
    publishNftMetadataMock.mockResolvedValue({ imageCid: "bafy-img-cid" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data.serial).toBe(SerialErrorResponse.METADATA_PUBLISH_FAILED);
    expect(setImageCidMock).toHaveBeenCalledWith("1998-07-29", 1, "0.0.1", "bafy-img-cid");
    expect(setPublishedCidsMock).not.toHaveBeenCalled();
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
  });

  it("still releases the claim even if persisting the lone imageCid itself fails", async () => {
    publishNftMetadataMock.mockResolvedValue({ imageCid: "bafy-img-cid" });
    setImageCidMock.mockResolvedValue({ success: false, reason: "ConditionalCheckFailedException" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data.serial).toBe(SerialErrorResponse.METADATA_PUBLISH_FAILED);
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
  });

  it("releases the claim via releaseClaim when setPublishedCids fails", async () => {
    setPublishedCidsMock.mockResolvedValue({ success: false, reason: "ConditionalCheckFailedException" });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.data.serial).toBe(SerialErrorResponse.METADATA_PUBLISH_FAILED);
    expect(submitNftMetadataUpdateMock).not.toHaveBeenCalled();
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
  });

  it("passes both cids to setPublishedCids", async () => {
    await call("0.0.1", "1998-07-29", "1");
    expect(setPublishedCidsMock).toHaveBeenCalledWith(
      "1998-07-29",
      1,
      "0.0.1",
      "bafy-img-cid",
      "bafy-cid"
    );
  });

  // See PUNCHLIST.md Finding 27: blocked is a hard stop regardless of
  // mintEnabled (mocked true by default in beforeEach above).
  it("rejects a blocked account even though minting is globally enabled", async () => {
    getAccountMock.mockResolvedValue({ blocked: true });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(claimPerformanceMock).not.toHaveBeenCalled();
  });

  // See PUNCHLIST.md Finding 28: mintEnabled now comes from dol-app-config
  // (getAppConfig), read live - not the old build-time NEXT_PUBLIC_MINT_ENABLED.
  it("rejects an unlisted account while the soft switch is paused", async () => {
    getAppConfigMock.mockResolvedValue({ mintEnabled: false });

    const res = await call("0.0.1", "1998-07-29", "1");
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(claimPerformanceMock).not.toHaveBeenCalled();
  });
});
