import type { Mock } from "vitest";
import { verifyClientAction } from "@erikmuir/dol-lib/server/dapp";
import { auditClient } from "@erikmuir/dol-lib/server/dynamo";
import { POST } from "./route";

vi.mock("@erikmuir/dol-lib/server/dapp", () => ({
  verifyClientAction: vi.fn(),
}));
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  auditClient: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = (body: unknown) => ({ json: async () => body }) as any;

const call = async (accountId: string, body: unknown) =>
  POST(makeRequest(body), { params: Promise.resolve({ accountId }) });

describe("/api/audit/[accountId] POST", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects a malformed accountId before ever verifying anything", async () => {
    const res = await call("not-an-account", { action: "NFT_PURCHASE", context: {} });
    expect(res.status).toBe(400);
    expect(verifyClientAction).not.toHaveBeenCalled();
  });

  it("rejects an action outside the client-legal set", async () => {
    const res = await call("0.0.1", { action: "TOKEN_MINT_BATCH", context: {} });
    expect(res.status).toBe(400);
    expect(verifyClientAction).not.toHaveBeenCalled();
  });

  it("rejects and does not write when verification doesn't accept the event", async () => {
    (verifyClientAction as Mock).mockResolvedValueOnce({
      accepted: false,
      reason: "No matching claim for this performance/serial",
    });
    const res = await call("0.0.1", {
      action: "NFT_PURCHASE",
      success: true, // a lie - shouldn't matter either way once rejected
      context: { tokenId: "0.0.t", serial: 7, showDate: "1998-07-29", position: 1 },
    });
    expect(res.status).toBe(400);
    expect(auditClient).not.toHaveBeenCalled();
  });

  it("writes with the server-verified success value, not the client-claimed one", async () => {
    (verifyClientAction as Mock).mockResolvedValueOnce({ accepted: true, success: false });
    const res = await call("0.0.1", {
      action: "NFT_PURCHASE",
      success: true, // client claims success - the real check says otherwise
      context: { tokenId: "0.0.t", serial: 7, showDate: "1998-07-29", position: 1 },
    });
    expect(res.status).toBe(200);
    expect(auditClient).toHaveBeenCalledWith(
      expect.objectContaining({ action: "NFT_PURCHASE", success: false, accountId: "0.0.1" })
    );
  });

  it("strips context keys not relevant to the action before verifying/writing", async () => {
    (verifyClientAction as Mock).mockResolvedValueOnce({ accepted: true, success: true });
    await call("0.0.1", {
      action: "TOKEN_ASSOCIATE",
      context: { tokenId: "0.0.t", showDate: "should not survive", huge: "x".repeat(10000) },
    });
    const [, , context] = (verifyClientAction as Mock).mock.calls[0];
    expect(context).toEqual({ tokenId: "0.0.t" });
  });

  it("caps oversized string context values instead of storing them whole", async () => {
    (verifyClientAction as Mock).mockResolvedValueOnce({ accepted: true, success: true });
    await call("0.0.1", {
      action: "TOKEN_ASSOCIATE",
      context: { tokenId: "0.0.t", error: "x".repeat(10000) },
    });
    const [, , context] = (verifyClientAction as Mock).mock.calls[0];
    expect(context.error.length).toBe(500);
  });
});
