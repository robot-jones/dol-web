import { getAccount } from "@erikmuir/dol-lib/server/dynamo";

// Replaces the old NEXT_PUBLIC_WHITE_LIST/isWhiteList() env-var check with
// real account state - see PUNCHLIST.md Finding 27. Two real wins over the
// env var: (1) NEXT_PUBLIC_WHITE_LIST needed a full Vercel redeploy to
// expand, this is a plain Dynamo write with instant effect; (2) the env var
// was baked into the public client bundle (readable by anyone), this isn't.
// `blocked` is a hard stop regardless of `mintEnabled` - a blocked account
// can't get back in just because the gate opens later. Otherwise same
// shape as before: mint is allowed once it's open to everyone, or earlier
// for an individually whitelisted account.
export const canMint = async (
  accountId: string,
  mintEnabled: boolean
): Promise<boolean> => {
  const account = await getAccount(accountId);
  if (account?.blocked) return false;
  return mintEnabled || Boolean(account?.whitelisted);
};
