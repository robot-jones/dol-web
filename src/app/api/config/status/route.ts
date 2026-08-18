import { NextResponse } from "next/server";
import { getAppConfig } from "@erikmuir/dol-lib/server/dynamo";
import { getCollectionMintStatus } from "@erikmuir/dol-lib/dapp";
import { getMirrorClient } from "@erikmuir/dol-lib/server/api";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { AppConfigStatus } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";

// /api/config/status
//
// Global, not account-scoped - for the client, which can't read Dynamo
// directly. Mint routes gate on the live soft switch themselves via their
// own `getAppConfig` call (mint-gate.ts), not this endpoint. Kept separate
// from /api/account/[accountId]/status since this doesn't need a wallet.
// collectionMintStatus is derived here rather than shipping the raw
// inputs to the client.

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
