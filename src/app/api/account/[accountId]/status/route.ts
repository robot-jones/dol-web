import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@erikmuir/dol-lib/server/dynamo";
import { AccountStatus } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";

// /api/account/[accountId]/status
//
// One round trip covering whitelist + blocklist, for the client (which
// can't read Dynamo directly). Mint routes gate server-side via their own
// `getAccount` call (mint-gate.ts), not this endpoint.

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
