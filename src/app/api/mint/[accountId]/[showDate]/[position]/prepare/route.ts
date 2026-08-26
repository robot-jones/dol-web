import { NextRequest, NextResponse } from "next/server";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { PerformanceAttributes, SerialErrorResponse } from "@erikmuir/dol-lib/types";
import { claimPerformance, publishNftMetadata, submitNftMetadataUpdate, releaseClaim } from "@erikmuir/dol-lib/server/dapp";
import { setPublishedCids, setImageCid, confirmMetadataOnChain, getPerformance } from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/[showDate]/[position]/prepare
//
// AC/DC Bag (CART.md, checklist item 1): the "Add to Bag" step. Same
// claim-then-publish work as the single-item pre-transfer route
// (../route.ts), minus building the TransferTransaction - that now
// belongs to the (not yet built) checkout endpoint, which builds one
// transaction covering every prepared item at once. Called once per
// "Add to Bag" click, up to 10x (Hedera's per-transfer NFT-leg limit).
//
// 60s (Vercel's Hobby-tier cap) - a cold start (chromium extraction,
// render, two sequential Pinata uploads) routinely exceeds the 10s default.
export const maxDuration = 60;

export type PrepareParams = {
  accountId: string;
  showDate: string;
  position: string;
};

export type ServerPrepareResponse = {
  serial: number | SerialErrorResponse;
  lockedAt?: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<PrepareParams> }
): Promise<NextResponse<StandardPayload<ServerPrepareResponse | string>>> {
  const { showDate, position, accountId } = await params;
  const parsedPosition = parseInt(position);

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

  // Distinct from setPublishedCids above: this is the signal releaseClaim
  // uses to know the on-chain call actually succeeded (not just that
  // metadataCid was published to IPFS), so an abandoned claim past this
  // point gets its serial reset back to the placeholder on release.
  const confirmResult = await confirmMetadataOnChain(showDate, parsedPosition, accountId);
  if (!confirmResult.success) {
    console.error(`Failed to record on-chain metadata confirmation: ${confirmResult.reason}`);
  }

  // So the client can show "Locked for mm:ss" immediately, without
  // waiting on a reload to pick up the server-side value.
  const claimedPerformance = await getPerformance(showDate, parsedPosition);

  return success({ serial, lockedAt: claimedPerformance?.lockedAt });
}
