import { NextRequest, NextResponse } from "next/server";
import { releaseClaim } from "@erikmuir/dol-lib/server/dapp";
import { ReleaseReason } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";

// /api/mint/[accountId]/[showDate]/[position]/[serial]/abort
//
// Releases a claim that never got paid for. Delegates to releaseClaim,
// which also unpins whatever was already published to IPFS - a stale/late
// call here is always harmless. Doesn't cover tab-closes-mid-flow - the
// manual reconciliation script handles that.

export type AbortTransferParams = {
  accountId: string;
  showDate: string;
  position: string;
  serial: string;
};

// A client-declared `reason` is genuinely needed here (unlike most routes,
// which re-derive everything server-side) since the server can't otherwise
// tell why this was called. Anything not in this list (including missing/
// malformed) falls back to SYSTEM_FAILURE, which never counts toward the
// abandonment cap - a bad client value shouldn't penalize an account.
const ClientReportableReasons: ReleaseReason[] = [
  "USER_CANCELLED",
  "WALLET_REJECTED",
  "SYSTEM_FAILURE",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<AbortTransferParams> }
): Promise<NextResponse<StandardPayload<void | string>>> {
  try {
    const { accountId, showDate, position } = await params;
    const parsedPosition = parseInt(position, 10);
    const body = await req.json().catch(() => undefined);
    const requestedReason = body?.reason;
    const reason: ReleaseReason = ClientReportableReasons.includes(requestedReason)
      ? requestedReason
      : "SYSTEM_FAILURE";
    await releaseClaim(accountId, showDate, parsedPosition, reason);
  } catch (e) {
    console.error(e);
  }
  return success(void 0);
}
