import { NextResponse } from "next/server";
import { getAppConfig } from "@erikmuir/dol-lib/server/dynamo";
import { getCollectionMintStatus } from "@erikmuir/dol-lib/dapp";
import { getMirrorClient } from "@erikmuir/dol-lib/server/api";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { AppConfigStatus } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";

// /api/config/status
//
// Global, not account-scoped - see PUNCHLIST.md Finding 28. Both mint
// routes gate on the live soft switch themselves via their own direct
// `getAppConfig` call (see `mint-gate.ts`), not this endpoint - no reason
// for a server route to make an HTTP round trip to itself. This endpoint
// exists for the client (`Performance.tsx`), which can't read Dynamo
// directly and previously read the build-time NEXT_PUBLIC_MINT_ENABLED env
// var instead. Deliberately a separate endpoint from
// /api/account/[accountId]/status rather than folded into it: this value
// isn't account-scoped, so it shouldn't require a connected wallet to see.
//
// collectionMintStatus is derived here, server-side, rather than shipping
// launchedAt/endedAt/totalSupply/maxSupply to the client for it to derive
// itself - keeps getCollectionMintStatus's inputs in one place and the
// client dead simple.

export async function GET(): Promise<NextResponse<StandardPayload<AppConfigStatus>>> {
  const hfbCollectionId = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);
  const [config, tokenInfo] = await Promise.all([
    getAppConfig(),
    getMirrorClient().getTokenInfo(hfbCollectionId),
  ]);

  const mintEnabled = Boolean(config?.mintEnabled);
  const totalSupply = Number(tokenInfo?.total_supply ?? 0);
  const maxSupply = Number(tokenInfo?.max_supply ?? 0);

  return success({
    mintEnabled,
    collectionMintStatus: getCollectionMintStatus(
      mintEnabled,
      config?.launchedAt,
      config?.endedAt,
      totalSupply,
      maxSupply
    ),
  });
}
