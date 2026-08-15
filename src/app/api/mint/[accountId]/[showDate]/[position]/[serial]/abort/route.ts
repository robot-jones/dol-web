import { NextRequest, NextResponse } from "next/server";
import { releaseClaim } from "@erikmuir/dol-lib/server/dapp";
import { ReleaseReason } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";

// /api/mint/[accountId]/[showDate]/[position]/[serial]/abort
//
// Releases a claim that never got paid for - e.g. the buyer's wallet
// rejected or failed the transfer, or an explicit cancel. Delegates to
// releaseClaim (see PUNCHLIST.md's "releaseClaim choke point", Finding
// 25/27), which handles both the performance/serial release and unpinning
// whatever was already published to IPFS - a stale/late call here is
// always harmless, same as the underlying conditional writes always were.
// This intentionally does NOT cover the tab-closes-mid-flow case - see
// PUNCHLIST.md Phase 2's manual reconciliation script for that.

export type AbortTransferParams = {
  accountId: string;
  showDate: string;
  position: string;
  serial: string;
};

// Performance.tsx calls this route from three different moments, and the
// server has no other way to tell them apart - a client-declared `reason`
// is genuinely needed here (unlike most of this app's routes, which
// re-derive everything from server-side state; see Finding 14). Only the
// reasons a browser could plausibly report are accepted; anything else
// (including a missing/malformed value) falls back to SYSTEM_FAILURE, the
// one reason that never counts toward Finding 27's future abandonment cap
// - a bad client value should never accidentally penalize an account.
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
