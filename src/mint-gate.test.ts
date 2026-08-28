const getAccountMock = vi.fn();
const getAppConfigMock = vi.fn();
const unwhitelistAccountMock = vi.fn();
const countLockedPerformancesMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/dynamo", () => ({
  getAccount: (...a: unknown[]) => getAccountMock(...a),
  getAppConfig: (...a: unknown[]) => getAppConfigMock(...a),
  unwhitelistAccount: (...a: unknown[]) => unwhitelistAccountMock(...a),
  countLockedPerformances: (...a: unknown[]) => countLockedPerformancesMock(...a),
}));

import { canMint, consumeEarlyMintWhitelist, canLockAnotherPresaleItem } from "@/mint-gate";

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

// The server-side backstop behind the client's maxCartItems=1 presale cap
// (MintAction.tsx) - see the CART.md note this fixes: without it, a
// whitelisted account could lock 2+ performances before ever finalizing
// any of them, then have the first finalize's consumeEarlyMintWhitelist
// call silently break finalizing the rest of the same checkout.
describe("canLockAnotherPresaleItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a second concurrent lock for a whitelisted account before launch", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false, launchedAt: undefined });
    countLockedPerformancesMock.mockResolvedValueOnce(1);
    expect(await canLockAnotherPresaleItem("0.0.1")).toBe(false);
  });

  it("allows the first lock for a whitelisted account before launch", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false, launchedAt: undefined });
    countLockedPerformancesMock.mockResolvedValueOnce(0);
    expect(await canLockAnotherPresaleItem("0.0.1")).toBe(true);
  });

  it("doesn't apply the cap once mint is broadly enabled, even pre-launch", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: true, launchedAt: undefined });
    expect(await canLockAnotherPresaleItem("0.0.1")).toBe(true);
    expect(countLockedPerformancesMock).not.toHaveBeenCalled();
  });

  it("doesn't apply the cap once launched, even if still whitelisted", async () => {
    getAccountMock.mockResolvedValueOnce({ whitelisted: true });
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false, launchedAt: 1700000000000 });
    expect(await canLockAnotherPresaleItem("0.0.1")).toBe(true);
    expect(countLockedPerformancesMock).not.toHaveBeenCalled();
  });

  it("doesn't apply to a non-whitelisted account at all", async () => {
    getAccountMock.mockResolvedValueOnce(undefined);
    getAppConfigMock.mockResolvedValueOnce({ mintEnabled: false, launchedAt: undefined });
    expect(await canLockAnotherPresaleItem("0.0.1")).toBe(true);
    expect(countLockedPerformancesMock).not.toHaveBeenCalled();
  });
});
