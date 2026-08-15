import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@erikmuir/dol-lib/server/dynamo";
import { AccountStatus } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";

// /api/account/[accountId]/status
//
// One round trip covering both the whitelist and blocklist checks - see
// PUNCHLIST.md Finding 27. Both mint routes gate the same way server-side
// via their own direct `getAccount` call (see `mint-gate.ts`), not this
// endpoint - no reason for a server route to make an HTTP round trip to
// itself. This endpoint exists for the client (`Performance.tsx`), which
// can't read Dynamo directly and previously read `NEXT_PUBLIC_WHITE_LIST`
// out of the bundle instead - the same `NEXT_PUBLIC_*`-as-gating footgun
// Finding 2 already flagged elsewhere in this codebase.

export type AccountStatusParams = {
  accountId: string;
};

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<AccountStatusParams> }
): Promise<NextResponse<StandardPayload<AccountStatus>>> {
  const { accountId } = await params;
  const account = await getAccount(accountId);
  return success({
    whitelisted: Boolean(account?.whitelisted),
    blocked: Boolean(account?.blocked),
  });
}
