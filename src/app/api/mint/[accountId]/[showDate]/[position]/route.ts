import { NextRequest, NextResponse } from "next/server";
import { Hbar, TransferTransaction } from "@hashgraph/sdk";
import { PublicEnvKeys, getBoolean, getRequired } from "@erikmuir/dol-lib/env";
import { PerformanceAttributes, SerialErrorResponse } from "@erikmuir/dol-lib/types";
import { getHederaClient } from "@erikmuir/dol-lib/server/blockchain";
import { claimPerformance, publishNftMetadata } from "@erikmuir/dol-lib/server/dapp";
import { setMetadataCid, unlockPerformance, releaseSerial } from "@erikmuir/dol-lib/server/dynamo";
import { getPerformanceId } from "@erikmuir/dol-lib/dapp";
import { badRequest, StandardPayload, success } from "@/utils";
import { isWhiteList } from "@/env";

// /api/mint/[accountId]/[showDate]/[position] (pre-transfer endpoint)
//
// Claims the performance, then does the slow/failure-prone work (render +
// 2 IPFS uploads) before any money moves - see PUNCHLIST.md Finding 1/Phase
// 2. If metadata publishing fails, the claim is released immediately so
// the performance doesn't sit stuck for a failure that happened before the
// buyer ever saw a wallet prompt.
//
// Vercel's default function timeout (10s) isn't enough for this route on a
// cold start: extracting @sparticuz/chromium's binary, launching it,
// rendering, and two sequential Pinata uploads routinely exceeds that on
// its own - see PUNCHLIST.md Finding 16's follow-up. 60s is Vercel's cap on
// the Hobby tier; comfortably covers a cold run without over-provisioning.
export const maxDuration = 60;

export type PreTransferParams = {
  accountId: string;
  showDate: string;
  position: string;
};

export type ServerPreTransferResponse = {
  serial: number | SerialErrorResponse;
  txBytes?: Uint8Array<ArrayBufferLike>;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<PreTransferParams> }
): Promise<NextResponse<StandardPayload<ServerPreTransferResponse | string>>> {
  const { showDate, position, accountId } = await params;
  const parsedPosition = parseInt(position);

  const mintEnabled = getBoolean(PublicEnvKeys.NEXT_PUBLIC_MINT_ENABLED);
  const hfbHbarPrice = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_HBAR_PRICE);
  const treasuryAccount = getRequired(PublicEnvKeys.NEXT_PUBLIC_TREASURY_ACCOUNT);
  const hfbCollectionId = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);

  if (!mintEnabled && !isWhiteList(accountId)) {
    return badRequest("Minting is disabled");
  }

  const attributes: PerformanceAttributes = await req.json();
  if (!attributes) {
    return badRequest("No attributes provided");
  }

  const serial = await claimPerformance(
    accountId,
    showDate,
    parsedPosition,
    attributes
  );

  if (serial <= 0) {
    return success({ serial });
  }

  const metadataCid = await publishNftMetadata(
    hfbCollectionId,
    serial,
    showDate,
    parsedPosition,
    accountId,
    attributes
  );

  const performanceId = getPerformanceId(showDate, parsedPosition);

  if (!metadataCid) {
    await unlockPerformance(showDate, parsedPosition, accountId);
    await releaseSerial(hfbCollectionId, serial, performanceId, accountId);
    return success({ serial: SerialErrorResponse.METADATA_PUBLISH_FAILED });
  }

  const setMetadataCidResult = await setMetadataCid(showDate, parsedPosition, accountId, metadataCid);
  if (!setMetadataCidResult.success) {
    console.error(`Failed to set metadataCid: ${setMetadataCidResult.reason}`);
    await unlockPerformance(showDate, parsedPosition, accountId);
    await releaseSerial(hfbCollectionId, serial, performanceId, accountId);
    return success({ serial: SerialErrorResponse.METADATA_PUBLISH_FAILED });
  }

  const client = getHederaClient();

  const transaction = new TransferTransaction()
    .addHbarTransfer(accountId, new Hbar(-hfbHbarPrice))
    .addHbarTransfer(treasuryAccount, new Hbar(hfbHbarPrice))
    .addNftTransfer(hfbCollectionId, serial, treasuryAccount, accountId)
    .freezeWith(client);
  const signedTx = await transaction.signWithOperator(client);
  const txBytes = signedTx.toBytes();

  return success({ serial, txBytes });
}
