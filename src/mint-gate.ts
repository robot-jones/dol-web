import { getAccount, getAppConfig } from "@erikmuir/dol-lib/server/dynamo";

// Replaces the old NEXT_PUBLIC_WHITE_LIST/isWhiteList() env-var check with
// real account state - see PUNCHLIST.md Finding 27. Two real wins over the
// env var: (1) NEXT_PUBLIC_WHITE_LIST needed a full Vercel redeploy to
// expand, this is a plain Dynamo write with instant effect; (2) the env var
// was baked into the public client bundle (readable by anyone), this isn't.
// `blocked` is a hard stop regardless of `mintEnabled` - a blocked account
// can't get back in just because the gate opens later. Otherwise same
// shape as before: mint is allowed once it's open to everyone, or earlier
// for an individually whitelisted account.
//
// `mintEnabled` itself moved the same way in Finding 28 - it used to be
// passed in by the caller, read out of the build-time-baked
// NEXT_PUBLIC_MINT_ENABLED env var; now it's read live from dol-app-config
// right here, alongside the account lookup, so both mint routes get the
// soft kill switch for free just by calling this. Fetched in parallel with
// the account lookup rather than sequentially - independent reads, no
// reason to pay for round trips one after another.
//
// Whitelist grants *early* access (pre-launch only), not a permanent
// bypass of a pause or an ended sale - `!launchedAt` is what scopes it to
// PRE specifically, same signal getCollectionMintStatus (dapp) uses to
// tell "never launched" apart from "launched before, closed now". Once
// launchedAt is set, whitelisted no longer matters here - mintEnabled is
// the only thing that can open the gate again. Found and fixed alongside
// the on-theme mint-status work, which is what made the gap visible.
export const canMint = async (accountId: string): Promise<boolean> => {
  const [account, appConfig] = await Promise.all([
    getAccount(accountId),
    getAppConfig(),
  ]);
  if (account?.blocked) return false;
  return Boolean(appConfig?.mintEnabled) || (!Boolean(appConfig?.launchedAt) && Boolean(account?.whitelisted));
};
