const getPerformanceMock = vi.fn();
const setSerialMock = vi.fn();
const getAccountMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getPerformance: (...a: unknown[]) => getPerformanceMock(...a),
  setSerial: (...a: unknown[]) => setSerialMock(...a),
  getAccount: (...a: unknown[]) => getAccountMock(...a),
}));

process.env.NEXT_PUBLIC_MINT_ENABLED = "true";

import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = () => ({}) as any;

const call = (accountId: string, showDate: string, position: string, serial: string) =>
  POST(makeRequest(), {
    params: Promise.resolve({ accountId, showDate, position, serial }),
  });

describe("/api/mint/[accountId]/[showDate]/[position]/[serial] POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountMock.mockResolvedValue(undefined);
  });

  it("rejects a blocked account even though minting is globally enabled", async () => {
    getAccountMock.mockResolvedValue({ blocked: true });
    const res = await call("0.0.1", "1998-07-29", "1", "7");
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(getPerformanceMock).not.toHaveBeenCalled();
  });

  it("reports success without redoing work when this exact claim is already finalized", async () => {
    getPerformanceMock.mockResolvedValue({ serial: 7, lockedBy: "0.0.1" });
    const res = await call("0.0.1", "1998-07-29", "1", "7");
    const body = await res.json();
    expect(body.data).toBe(true);
    expect(setSerialMock).not.toHaveBeenCalled();
  });

  it("reports failure without calling setSerial when the claim doesn't match", async () => {
    getPerformanceMock.mockResolvedValue({ lockedSerial: 7, lockedBy: "0.0.2", metadataCid: "Qm" });
    const res = await call("0.0.1", "1998-07-29", "1", "7");
    const body = await res.json();
    expect(body.data).toBe(false);
    expect(setSerialMock).not.toHaveBeenCalled();
  });

  it("finalizes the sale by calling setSerial when the claim matches", async () => {
    getPerformanceMock.mockResolvedValue({ lockedSerial: 7, lockedBy: "0.0.1", metadataCid: "Qm" });
    setSerialMock.mockResolvedValue({ success: true });
    const res = await call("0.0.1", "1998-07-29", "1", "7");
    const body = await res.json();
    expect(body.data).toBe(true);
    expect(setSerialMock).toHaveBeenCalledWith("1998-07-29", 1, "0.0.1", 7);
  });
});
