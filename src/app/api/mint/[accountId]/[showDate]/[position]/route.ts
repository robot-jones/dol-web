import { NextRequest, NextResponse } from "next/server";
import { Hbar, TransferTransaction } from "@hashgraph/sdk";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { PerformanceAttributes, SerialErrorResponse, Uint8ArrayWrapper } from "@erikmuir/dol-lib/types";
import { getHederaClient } from "@erikmuir/dol-lib/server/blockchain";
import { claimPerformance, publishNftMetadata, submitNftMetadataUpdate, releaseClaim } from "@erikmuir/dol-lib/server/dapp";
import { setPublishedCids, setImageCid, getPerformance } from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/[showDate]/[position] (pre-transfer endpoint)
//
// Claims the performance, then does the slow/failure-prone work (render, 2
// IPFS uploads, the on-chain metadata update) before any money moves -
// any failure in that chain is still a pre-payment failure, claim
// released immediately. This used to run post-transfer, which couldn't
// tell "never signed" apart from "signed, but the metadata tx failed."
//
// 60s (Vercel's Hobby-tier cap) - a cold start (chromium extraction,
// render, two sequential Pinata uploads) routinely exceeds the 10s default.
export const maxDuration = 60;

export type PreTransferParams = {
  accountId: string;
  showDate: string;
  position: string;
};

export type ServerPreTransferResponse = {
  serial: number | SerialErrorResponse;
  txBytes?: Uint8ArrayWrapper;
  lockedAt?: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<PreTransferParams> }
): Promise<NextResponse<StandardPayload<ServerPreTransferResponse | string>>> {
  const { showDate, position, accountId } = await params;
  const parsedPosition = parseInt(position);

  const hfbHbarPrice = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_HBAR_PRICE);
  const treasuryAccount = getRequired(PublicEnvKeys.NEXT_PUBLIC_TREASURY_ACCOUNT);
  const hfbCollectionId = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);

  if (!(await canMint(accountId))) {
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

  const { imageCid, metadataCid } = await publishNftMetadata(
    hfbCollectionId,
    serial,
    showDate,
    parsedPosition,
    accountId,
    attributes
  );

  if (!imageCid || !metadataCid) {
    // publishNftMetadata never throws - always returns whatever it managed
    // to publish. Persist a lone imageCid so releaseClaim can still find
    // and unpin it, rather than it being silently orphaned on Pinata.
    if (imageCid) {
      const setImageCidResult = await setImageCid(showDate, parsedPosition, accountId, imageCid);
      if (!setImageCidResult.success) {
        console.error(`Failed to set image CID: ${setImageCidResult.reason}`);
      }
    }
    await releaseClaim(accountId, showDate, parsedPosition, "SYSTEM_FAILURE");
    return success({ serial: SerialErrorResponse.METADATA_PUBLISH_FAILED });
  }

  const setPublishedCidsResult = await setPublishedCids(showDate, parsedPosition, accountId, imageCid, metadataCid);
  if (!setPublishedCidsResult.success) {
    console.error(`Failed to set published CIDs: ${setPublishedCidsResult.reason}`);
    await releaseClaim(accountId, showDate, parsedPosition, "SYSTEM_FAILURE");
    return success({ serial: SerialErrorResponse.METADATA_PUBLISH_FAILED });
  }

  const metadataUpdateSuccess = await submitNftMetadataUpdate(
    hfbCollectionId,
    serial,
    metadataCid,
    showDate,
    parsedPosition,
    accountId
  );
  if (!metadataUpdateSuccess) {
    console.error("Failed to submit on-chain metadata update.");
    await releaseClaim(accountId, showDate, parsedPosition, "SYSTEM_FAILURE");
    return success({ serial: SerialErrorResponse.METADATA_PUBLISH_FAILED });
  }

  const client = getHederaClient();

  const transaction = new TransferTransaction()
    .addHbarTransfer(accountId, new Hbar(-hfbHbarPrice))
    .addHbarTransfer(treasuryAccount, new Hbar(hfbHbarPrice))
    .addNftTransfer(hfbCollectionId, serial, treasuryAccount, accountId)
    .freezeWith(client);
  const signedTx = await transaction.signWithOperator(client);
  // Explicit { type: "Buffer", data: [...] } shape, not a raw Uint8Array -
  // JSON.stringify on a bare Uint8Array produces {"0":n,"1":n,...}, which
  // the client's `new Uint8Array(txBytes.data)` can't reconstruct.
  const txBytes: Uint8ArrayWrapper = {
    type: "Buffer",
    data: Array.from(signedTx.toBytes()),
  };

  // So the client can show "Locked for mm:ss" immediately, without
  // waiting on a reload to pick up the server-side value.
  const claimedPerformance = await getPerformance(showDate, parsedPosition);

  return success({ serial, txBytes, lockedAt: claimedPerformance?.lockedAt });
}
