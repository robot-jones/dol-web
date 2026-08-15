import { NextResponse } from "next/server";
import { getAppConfig } from "@erikmuir/dol-lib/server/dynamo";
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

export async function GET(): Promise<NextResponse<StandardPayload<AppConfigStatus>>> {
  const config = await getAppConfig();
  return success({ mintEnabled: Boolean(config?.mintEnabled) });
}
