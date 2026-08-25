import { getAccount, getAppConfig, unwhitelistAccount } from "@erikmuir/dol-lib/server/dynamo";

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
