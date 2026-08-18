import { getAccount, getAppConfig } from "@erikmuir/dol-lib/server/dynamo";

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
