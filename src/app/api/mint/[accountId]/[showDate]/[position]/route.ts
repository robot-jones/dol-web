import { NextRequest, NextResponse } from "next/server";
import { Hbar, TransferTransaction } from "@hashgraph/sdk";
import { PublicEnvKeys, getBoolean, getRequired } from "@erikmuir/dol-lib/env";
import { PerformanceAttributes, SerialErrorResponse, Uint8ArrayWrapper } from "@erikmuir/dol-lib/types";
import { getHederaClient } from "@erikmuir/dol-lib/server/blockchain";
import { claimPerformance, publishNftMetadata, submitNftMetadataUpdate, releaseClaim } from "@erikmuir/dol-lib/server/dapp";
import { setPublishedCids, setImageCid, getPerformance } from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/[showDate]/[position] (pre-transfer endpoint)
//
// Claims the performance, then does the slow/failure-prone work (render + 2
// IPFS uploads + the on-chain metadata update) before any money moves - see
// PUNCHLIST.md Finding 1/Phase 2. The on-chain update used to happen
// post-transfer, but that left a gap: if it failed after the buyer's wallet
// had already executed the transfer, Dynamo had no way to distinguish "never
// signed" from "signed and transferred, but the metadata tx failed" - both
// look like `lockedBy` set with no `serial`, so Finding 18's stuck-claim
// sweep would release the performance for someone else to claim again even
// though a real buyer already owned that serial. Doing the update here means
// any failure in this whole chain - render, either IPFS upload, or the
// on-chain update itself - is still a pre-payment failure: the claim is
// released immediately and no money has moved yet.
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
  txBytes?: Uint8ArrayWrapper;
  lockedAt?: number;
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

  if (!(await canMint(accountId, mintEnabled))) {
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
    // publishNftMetadata never throws - it always returns whatever it
    // actually managed to publish, even after an unexpected error (see
    // PUNCHLIST.md Finding 25). If the image half made it up before
    // metadata failed, persist that CID on its own so releaseClaim can
    // still find and unpin it below - otherwise it'd be silently orphaned
    // on Pinata forever.
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
  // Serialized explicitly as { type: "Buffer", data: [...] } (matching
  // dol-lib's Uint8ArrayWrapper) rather than sent as a raw Uint8Array -
  // JSON.stringify on a bare Uint8Array produces {"0":n,"1":n,...}, not an
  // array, which the client's `new Uint8Array(txBytes.data)` can't
  // reconstruct (txBytes.data is undefined -> an empty transaction, which
  // the SDK then fails to deserialize client-side). See PUNCHLIST.md
  // Finding 17.
  const txBytes: Uint8ArrayWrapper = {
    type: "Buffer",
    data: Array.from(signedTx.toBytes()),
  };

  // So the client can show "Locked for mm:ss" immediately once claimed,
  // without waiting on a page reload to pick up the server-side value -
  // see PUNCHLIST.md's two-click flow item, the immediate-timer follow-up.
  const claimedPerformance = await getPerformance(showDate, parsedPosition);

  return success({ serial, txBytes, lockedAt: claimedPerformance?.lockedAt });
}
