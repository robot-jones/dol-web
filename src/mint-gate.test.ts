const getAccountMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAccount: (...a: unknown[]) => getAccountMock(...a),
}));

import { canMint } from "@/mint-gate";

describe("canMint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a hard stop when blocked, even if mintEnabled is true", async () => {
    getAccountMock.mockResolvedValueOnce({ blocked: true, whitelisted: true });
    expect(await canMint("0.0.1", true)).toBe(false);
  });

  it("allows minting once globally enabled, for an unlisted account", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    expect(await canMint("0.0.1", true)).toBe(true);
  });

  it("blocks an unlisted account before the gate opens", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    expect(await canMint("0.0.1", false)).toBe(false);
  });

  it("lets a whitelisted account in early, before the gate opens", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    expect(await canMint("0.0.1", false)).toBe(true);
  });
});
