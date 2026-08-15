const getAccountMock = vi.fn();
const getAppConfigMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAccount: (...a: unknown[]) => getAccountMock(...a),
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
}));

import { canMint } from "@/mint-gate";

describe("canMint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a hard stop when blocked, even if mintEnabled is true", async () => {
    getAccountMock.mockResolvedValueOnce({ blocked: true, whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: true });
    expect(await canMint("0.0.1")).toBe(false);
  });

  it("allows minting once globally enabled, for an unlisted account", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: true });
    expect(await canMint("0.0.1")).toBe(true);
  });

  it("blocks an unlisted account before the gate opens", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false });
    expect(await canMint("0.0.1")).toBe(false);
  });

  it("lets a whitelisted account in early, before the gate opens", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false });
    expect(await canMint("0.0.1")).toBe(true);
  });

  it("fails closed (mint disabled) when the config row doesn't exist yet", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    getAppConfigMock.mockResolvedValueOnce(undefined);
    expect(await canMint("0.0.1")).toBe(false);
  });
});
