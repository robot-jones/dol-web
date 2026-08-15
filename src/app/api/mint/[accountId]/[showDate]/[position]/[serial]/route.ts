import { NextRequest, NextResponse } from "next/server";
import { getPerformance, setSerial } from "@erikmuir/dol-lib/server/dynamo";
import { PublicEnvKeys, getBoolean } from "@erikmuir/dol-lib/env";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/[showDate]/[position]/[serial] (post-transfer endpoint)
//
// Everything slow/failure-prone (render, IPFS uploads, and the on-chain
// metadata update itself) already happened pre-transfer - see the sibling
// route. Deliberately moved the on-chain update there too, not just the
// render/uploads: it's still a real Hedera transaction that can fail, and
// leaving it post-transfer meant a failure here happened *after* the buyer's
// wallet had already executed the transfer, with no way for Dynamo to tell
// that apart from "never signed at all" - see PUNCHLIST.md for the finding.
// This route is now just: verify the claim, and mark the performance sold.
// Safe to retry: if `serial` is already set for this exact claim, treat it
// as already-done rather than redo any work.

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
  const mintEnabled = getBoolean(PublicEnvKeys.NEXT_PUBLIC_MINT_ENABLED);

  if (!(await canMint(accountId, mintEnabled))) {
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
