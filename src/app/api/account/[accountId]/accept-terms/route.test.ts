const acceptTermsMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  acceptTerms: (...a: unknown[]) => acceptTermsMock(...a),
}));

import { LEGAL_TERMS_UPDATED } from "@/utils";
import { POST } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (accountId: string) => POST({} as any, { params: Promise.resolve({ accountId }) });

describe("/api/account/[accountId]/accept-terms POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a malformed accountId without calling acceptTerms", async () => {
    const res = await call("not-an-account-id");
    expect(res.status).toBe(400);
    expect(acceptTermsMock).not.toHaveBeenCalled();
  });

  it("records acceptance against the server's own current terms version, not anything from the request", async () => {
    acceptTermsMock.mockResolvedValueOnce({ success: true });
    const res = await call("0.0.1234");
    const body = await res.json();

    expect(acceptTermsMock).toHaveBeenCalledWith("0.0.1234", LEGAL_TERMS_UPDATED);
    expect(body.data).toBe(true);
  });

  it("reflects a failed write in the response", async () => {
    acceptTermsMock.mockResolvedValueOnce({ success: false, reason: "ConditionalCheckFailedException" });
    const res = await call("0.0.1234");
    const body = await res.json();

    expect(body.data).toBe(false);
  });
});
