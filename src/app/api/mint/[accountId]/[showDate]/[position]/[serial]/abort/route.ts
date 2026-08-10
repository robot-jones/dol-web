import { NextRequest, NextResponse } from "next/server";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { unlockPerformance, releaseSerial } from "@erikmuir/dol-lib/server/dynamo";
import { getPerformanceId } from "@erikmuir/dol-lib/dapp";
import { StandardPayload, success } from "@/utils";

// /api/mint/[accountId]/[showDate]/[position]/[serial]/abort
//
// Releases a claim that never got paid for - e.g. the buyer's wallet
// rejected or failed the transfer. Both releases are plain conditional
// writes (no TTL to wait out): unlockPerformance refuses to touch a
// performance that's already sold, and releaseSerial refuses to touch a
// serial that's since been reassigned, so a stale/late call here is always
// harmless. This intentionally does NOT cover the tab-closes-mid-flow case
// - see PUNCHLIST.md Phase 2's manual reconciliation script for that.

export type AbortTransferParams = {
  accountId: string;
  showDate: string;
  position: string;
  serial: string;
};

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<AbortTransferParams> }
): Promise<NextResponse<StandardPayload<void | string>>> {
  try {
    const { accountId, showDate, position, serial } = await params;
    const hfbCollectionId = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);
    const parsedPosition = parseInt(position, 10);
    const parsedSerial = parseInt(serial, 10);
    const performanceId = getPerformanceId(showDate, parsedPosition);
    await unlockPerformance(showDate, parsedPosition, accountId);
    await releaseSerial(hfbCollectionId, parsedSerial, performanceId, accountId);
  } catch (e) {
    console.error(e);
  }
  return success(void 0);
}
