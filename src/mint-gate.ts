import { getAccount, getAppConfig, unwhitelistAccount, countLockedPerformances } from "@erikmuir/dol-lib/server/dynamo";

// `blocked` is a hard stop regardless of `mintEnabled`. `mintEnabled` is
// read live from dol-app-config (the soft kill switch), not baked in at
// build time. Whitelist only grants *early* access, pre-launch - once
// `launchedAt` is set, whitelisted no longer matters here.
export const canMint = async (accountId: string): Promise<boolean> => {
  const [account, appConfig] = await Promise.all([
    getAccount(accountId),
    getAppConfig(),
  ]);
  if (account?.blocked) return false;
  return Boolean(appConfig?.mintEnabled) || (!Boolean(appConfig?.launchedAt) && Boolean(account?.whitelisted));
};

// Whitelisting buys exactly one early mint, not standing pre-launch access -
// call this once a claim actually finalizes (never earlier: an abandoned or
// failed claim shouldn't cost the account its early access). Mirrors
// canMint's own presale condition (`!launchedAt`) so a mint made *after*
// public launch - where whitelisted no longer gates anything - doesn't
// consume a still-whitelisted account's status for no reason.
export const consumeEarlyMintWhitelist = async (accountId: string): Promise<void> => {
  const [account, appConfig] = await Promise.all([
    getAccount(accountId),
    getAppConfig(),
  ]);
  if (appConfig?.launchedAt || !account?.whitelisted) return;

  const result = await unwhitelistAccount(accountId);
  if (!result.success) {
    console.error(`Failed to unwhitelist account after early mint: ${result.reason}`);
  }
};

// Whitelisting buys exactly one early mint (see consumeEarlyMintWhitelist
// above) - the bag's UI caps a presale account at 1 item
// (MintAction.tsx's maxCartItems), but that's client-side only. This is
// the server-side backstop, checked at prepare time: a whitelisted account
// can't hold a second concurrent locked-but-unsold performance while its
// only access is the presale whitelist (mint not otherwise open).
//
// Without this, a whitelisted account that bypassed the UI cap (or a
// future UI change that raised it) could lock 2+ performances, check out
// together in one paid transaction, and then hit a real bug: finalizing
// item 1 consumes the whitelist, which flips canMint false for that same
// account before item 2's own finalize call re-checks it - item 2 stays
// paid-for and transferred on-chain but never gets marked sold in Dynamo,
// stuck until manual investigation (releaseClaim's own on-chain ownership
// check refuses to auto-release something already transferred). Capping
// concurrent presale locks at 1 keeps that scenario from ever arising,
// rather than patching it after the fact at finalize time.
const MAX_PRESALE_LOCKS = 1;

export const canLockAnotherPresaleItem = async (accountId: string): Promise<boolean> => {
  const [account, appConfig] = await Promise.all([
    getAccount(accountId),
    getAppConfig(),
  ]);
  // Mirrors canMint's presale condition, minus the mintEnabled OR - this
  // only applies while access is *purely* via individual whitelisting, not
  // once mint is broadly open (mintEnabled true means "open to everyone,"
  // not "presale," so the per-account cap doesn't apply there).
  const presaleGated = !appConfig?.launchedAt && !appConfig?.mintEnabled && Boolean(account?.whitelisted);
  if (!presaleGated) return true;

  const lockedCount = await countLockedPerformances(accountId);
  return lockedCount < MAX_PRESALE_LOCKS;
};
