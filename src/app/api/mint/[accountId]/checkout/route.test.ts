const getPerformanceMock = vi.fn();
const getAccountMock = vi.fn();
const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
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

import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = (body: unknown) => ({ json: async () => body }) as any;

const call = async (accountId: string, items: { showDate: string; position: number }[]) =>
  POST(makeRequest({ items }), {
    params: Promise.resolve({ accountId }),
  });

const goodPerformance = (accountId: string, serial: number) => ({
  lockedBy: accountId,
  lockedSerial: serial,
});

describe("/api/mint/[accountId]/checkout POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountMock.mockResolvedValue(undefined);
    getAppConfigMock.mockResolvedValue({ mintEnabled: true });
  });

  it("builds one transaction covering every still-good item, with a leg per item", async () => {
    getPerformanceMock.mockImplementation((showDate: string, position: number) =>
      Promise.resolve(goodPerformance("0.0.1", position === 1 ? 7 : 8))
    );

    const res = await call("0.0.1", [
      { showDate: "1998-07-29", position: 1 },
      { showDate: "1998-07-29", position: 2 },
    ]);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.data.confirmed).toEqual([
      { showDate: "1998-07-29", position: 1 },
      { showDate: "1998-07-29", position: 2 },
    ]);
    expect(body.data.expired).toEqual([]);
    expect(chainable.addNftTransfer).toHaveBeenCalledTimes(2);
    expect(chainable.addNftTransfer).toHaveBeenNthCalledWith(1, "0.0.token", 7, "0.0.treasury", "0.0.1");
    expect(chainable.addNftTransfer).toHaveBeenNthCalledWith(2, "0.0.token", 8, "0.0.treasury", "0.0.1");
    // One addHbarTransfer pair per item, mirroring the single-item route -
    // not summed into one aggregate pair (CART.md checklist item 3).
    expect(chainable.addHbarTransfer).toHaveBeenCalledTimes(4);
  });

  it("returns txBytes as an explicit Buffer-shaped wrapper the client can reconstruct from", async () => {
    getPerformanceMock.mockResolvedValue(goodPerformance("0.0.1", 7));

    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: 1 }]);
    const body = await res.json();

    expect(body.data.txBytes).toEqual({ type: "Buffer", data: Array.from(rawBytes) });
    expect(new Uint8Array(body.data.txBytes.data)).toEqual(rawBytes);
  });

  // The 15-minute stuck-claim sweep (PUNCHLIST.md Finding 18) can reclaim a
  // prepared item between "Add to Bag" and checkout - this is what defends
  // against building a transaction for something no longer actually locked.
  it("drops an item whose lock was reclaimed by the sweep, keeping the rest", async () => {
    getPerformanceMock.mockImplementation((showDate: string, position: number) =>
      Promise.resolve(position === 1 ? goodPerformance("0.0.1", 7) : undefined)
    );

    const res = await call("0.0.1", [
      { showDate: "1998-07-29", position: 1 },
      { showDate: "1998-07-29", position: 2 },
    ]);
    const body = await res.json();

    expect(body.data.confirmed).toEqual([{ showDate: "1998-07-29", position: 1 }]);
    expect(body.data.expired).toEqual([{ showDate: "1998-07-29", position: 2 }]);
    expect(chainable.addNftTransfer).toHaveBeenCalledTimes(1);
  });

  it("drops an item locked by a different account", async () => {
    getPerformanceMock.mockResolvedValue(goodPerformance("0.0.someone-else", 7));

    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: 1 }]);
    const body = await res.json();

    expect(body.data.confirmed).toEqual([]);
    expect(body.data.expired).toEqual([{ showDate: "1998-07-29", position: 1 }]);
  });

  it("drops an item that's already sold", async () => {
    getPerformanceMock.mockResolvedValue({ lockedBy: "0.0.1", lockedSerial: 7, serial: 7 });

    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: 1 }]);
    const body = await res.json();

    expect(body.data.confirmed).toEqual([]);
    expect(body.data.expired).toEqual([{ showDate: "1998-07-29", position: 1 }]);
  });

  it("returns no txBytes when every item expired", async () => {
    getPerformanceMock.mockResolvedValue(undefined);

    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: 1 }]);
    const body = await res.json();

    expect(body.data.txBytes).toBeUndefined();
    expect(body.data.expired).toEqual([{ showDate: "1998-07-29", position: 1 }]);
    expect(chainable.signWithOperator).not.toHaveBeenCalled();
  });

  it("rejects an empty items list", async () => {
    const res = await call("0.0.1", []);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects more than 10 items", async () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ showDate: "1998-07-29", position: i }));
    const res = await call("0.0.1", items);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed item", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: "1" } as any]);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects a blocked account before checking any items", async () => {
    getAccountMock.mockResolvedValue({ blocked: true });

    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: 1 }]);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("rejects while the soft mint switch is paused", async () => {
    getAppConfigMock.mockResolvedValue({ mintEnabled: false });

    const res = await call("0.0.1", [{ showDate: "1998-07-29", position: 1 }]);
    const body = await res.json();

    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });
});
