const getAccountMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAccount: (...a: unknown[]) => getAccountMock(...a),
}));

import { GET } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (accountId: string) => GET({} as any, { params: Promise.resolve({ accountId }) });

describe("/api/account/[accountId]/status GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns both flags false for an account with no row at all", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    const res = await call("0.0.1");
    const body = await res.json();
    expect(body.data).toEqual({ whitelisted: false, blocked: false });
  });

  it("reflects whitelisted", async () => {
    getAccountMock.mockResolvedValueOnce({ accountId: "0.0.1", whitelisted: true });
    const res = await call("0.0.1");
    const body = await res.json();
    expect(body.data).toEqual({ whitelisted: true, blocked: false });
  });

  it("reflects blocked", async () => {
    getAccountMock.mockResolvedValueOnce({ accountId: "0.0.1", blocked: true, blockedAt: 123 });
    const res = await call("0.0.1");
    const body = await res.json();
    expect(body.data).toEqual({ whitelisted: false, blocked: true });
  });
});
