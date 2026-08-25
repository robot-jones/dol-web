const getAccountMock = vi.fn();
const getAppConfigMock = vi.fn();
const unwhitelistAccountMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAccount: (...a: unknown[]) => getAccountMock(...a),
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
  unwhitelistAccount: (...a: unknown[]) => unwhitelistAccountMock(...a),
}));

import { canMint, consumeEarlyMintWhitelist } from "@/mint-gate";

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

  it("lets a whitelisted account in early, before the gate has ever opened (no launchedAt)", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false });
    expect(await canMint("0.0.1")).toBe(true);
  });

  it("does NOT let a whitelisted account bypass a pause once the gate has already opened once", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false, launchedAt: 1700000000000 });
    expect(await canMint("0.0.1")).toBe(false);
  });

  it("fails closed (mint disabled) when the config row doesn't exist yet", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    getAppConfigMock.mockResolvedValueOnce(undefined);
    expect(await canMint("0.0.1")).toBe(false);
  });
});

describe("consumeEarlyMintWhitelist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unwhitelistAccountMock.mockResolvedValue({ success: true });
  });

  it("unwhitelists a whitelisted account that minted before launch", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ launchedAt: undefined });
    await consumeEarlyMintWhitelist("0.0.1");
    expect(unwhitelistAccountMock).toHaveBeenCalledWith("0.0.1");
  });

  it("does nothing for an account that was never whitelisted", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: false });
    getAppConfigMock.mockResolvedValueOnce({ launchedAt: undefined });
    await consumeEarlyMintWhitelist("0.0.1");
    expect(unwhitelistAccountMock).not.toHaveBeenCalled();
  });

  it("leaves a whitelisted account alone once the gate has launched - it no longer bought them anything", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ launchedAt: 1700000000000 });
    await consumeEarlyMintWhitelist("0.0.1");
    expect(unwhitelistAccountMock).not.toHaveBeenCalled();
  });
});
