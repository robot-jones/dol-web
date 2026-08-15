const releaseClaimMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dapp", () => ({
  releaseClaim: (...a: unknown[]) => releaseClaimMock(...a),
}));

import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = (body: unknown) => ({ json: async () => body }) as any;

const call = (accountId: string, showDate: string, position: string, serial: string, body: unknown) =>
  POST(makeRequest(body), {
    params: Promise.resolve({ accountId, showDate, position, serial }),
  });

describe("/api/mint/[accountId]/[showDate]/[position]/[serial]/abort POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseClaimMock.mockResolvedValue({ success: true });
  });

  it("passes through a client-reported reason releaseClaim can act on", async () => {
    await call("0.0.1", "1998-07-29", "1", "7", { reason: "USER_CANCELLED" });
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "USER_CANCELLED");
  });

  it.each(["WALLET_REJECTED", "SYSTEM_FAILURE"])(
    "accepts %s, another reason a browser can plausibly report",
    async (reason) => {
      await call("0.0.1", "1998-07-29", "1", "7", { reason });
      expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, reason);
    }
  );

  it("falls back to SYSTEM_FAILURE for a reason no browser call site sends, so a bad value can't be gamed into a client-controlled abandonment reason", async () => {
    await call("0.0.1", "1998-07-29", "1", "7", { reason: "SWEEP_TIMEOUT" });
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
  });

  it("falls back to SYSTEM_FAILURE when the body is missing or malformed", async () => {
    await call("0.0.1", "1998-07-29", "1", "7", undefined);
    expect(releaseClaimMock).toHaveBeenCalledWith("0.0.1", "1998-07-29", 1, "SYSTEM_FAILURE");
  });

  it("still returns success even if releaseClaim throws", async () => {
    releaseClaimMock.mockRejectedValueOnce(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call("0.0.1", "1998-07-29", "1", "7", { reason: "USER_CANCELLED" });
    const body = await res.json();
    expect(body.ok).toBe(true);
    errorSpy.mockRestore();
  });
});
