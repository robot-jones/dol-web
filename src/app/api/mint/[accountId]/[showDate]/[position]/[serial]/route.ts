import { NextRequest, NextResponse } from "next/server";
import { getPerformance, setSerial } from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/[showDate]/[position]/[serial] (post-transfer endpoint)
//
// Everything slow/failure-prone already happened pre-transfer (see the
// sibling route) - this is just: verify the claim, mark the performance
// sold. Safe to retry: if `serial` is already set for this exact claim,
// treat it as already-done.

export type PostTransferParams = {
  accountId: string;
  showDate: string;
  position: string;
  serial: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<PostTransferParams> }
): Promise<NextResponse<StandardPayload<boolean | string>>> {
  const { accountId, showDate, position, serial } = await params;

  if (!(await canMint(accountId))) {
    return badRequest("Minting is disabled");
  }

  const parsedPosition = parseInt(position, 10);
  const parsedSerial = parseInt(serial, 10);

  const performance = await getPerformance(showDate, parsedPosition);

  // Already finalized by an earlier attempt at this exact call - nothing
  // left to do, so this is safe to report as success without redoing work.
  if (performance?.serial === parsedSerial && performance.lockedBy === accountId) {
    return success(true);
  }

  if (
    !performance ||
    performance.lockedSerial !== parsedSerial ||
    performance.lockedBy !== accountId ||
    !performance.metadataCid
  ) {
    console.log("Performance not claimed, or claim doesn't match:", {
      performanceFound: Boolean(performance),
      lockedSerial: performance?.lockedSerial,
      lockedBy: performance?.lockedBy,
      hasMetadataCid: Boolean(performance?.metadataCid),
      expectedSerial: parsedSerial,
      expectedAccountId: accountId,
    });
    return success(false);
  }

  const setSerialResult = await setSerial(
    showDate,
    parsedPosition,
    accountId,
    parsedSerial
  );
  if (!setSerialResult.success) {
    console.error(
      `Failed to set serial on performance: ${setSerialResult.reason}`
    );
    return success(false);
  }

  return success(true);
}
