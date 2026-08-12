const claimPerformanceMock = vi.fn();
const publishNftMetadataMock = vi.fn();
const submitNftMetadataUpdateMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dapp", () => ({
  claimPerformance: (...a: unknown[]) => claimPerformanceMock(...a),
  publishNftMetadata: (...a: unknown[]) => publishNftMetadataMock(...a),
  submitNftMetadataUpdate: (...a: unknown[]) => submitNftMetadataUpdateMock(...a),
}));

const setMetadataCidMock = vi.fn();
const unlockPerformanceMock = vi.fn();
const releaseSerialMock = vi.fn();
const getPerformanceMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  setMetadataCid: (...a: unknown[]) => setMetadataCidMock(...a),
  unlockPerformance: (...a: unknown[]) => unlockPerformanceMock(...a),
  releaseSerial: (...a: unknown[]) => releaseSerialMock(...a),
  getPerformance: (...a: unknown[]) => getPerformanceMock(...a),
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

process.env.NEXT_PUBLIC_MINT_ENABLED = "true";
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
    publishNftMetadataMock.mockResolvedValue("bafy-cid");
    setMetadataCidMock.mockResolvedValue({ success: true });
    submitNftMetadataUpdateMock.mockResolvedValue(true);
    getPerformanceMock.mockResolvedValue({ lockedAt: 1786300000000 });
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
    expect(unlockPerformanceMock).toHaveBeenCalledWith("1998-07-29", 1, "0.0.1");
    expect(releaseSerialMock).toHaveBeenCalledWith("0.0.token", 7, "19980729:1", "0.0.1");
    expect(chainable.addHbarTransfer).not.toHaveBeenCalled();
  });
});
