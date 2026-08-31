import { NextRequest, NextResponse } from "next/server";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { PerformanceAttributes } from "@erikmuir/dol-lib/types";
import { publishNftMetadata, submitNftMetadataUpdate } from "@erikmuir/dol-lib/server/dapp";
import { unpinFile } from "@erikmuir/dol-lib/server/blockchain";
import {
  getPerformance,
  setPublishedCids,
  updateClaimedAttributes,
} from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/[showDate]/[position]/update
//
// "Update Bag Item" (CART.md): re-publishes a still-locked, not-yet-sold
// item's customizable attributes (background/donut/subject/inscription) -
// for a buyer who added a performance before finishing customizing it, or
// changed their mind while it sits in the bag. Deliberately never touches
// lockedBy/lockedSerial/lockedAt (see updateClaimedAttributes) - unlike
// prepare/route.ts this never calls claimPerformance, so the 15-minute
// lock window is untouched either way.
//
// 60s (Vercel's Hobby-tier cap), same reasoning as prepare/route.ts - a
// cold start (render, two sequential Pinata uploads) routinely exceeds the
// 10s default.
export const maxDuration = 60;

export type UpdateParams = {
  accountId: string;
  showDate: string;
  position: string;
};

// Mirrors prepare/route.ts's own limit - see that file's comment for why
// this is checked here too, not just client-side.
const MAX_INSCRIPTION_LENGTH = 100;

export type ServerUpdateResponse = {
  success: boolean;
  reason?: "NOT_LOCKED" | "METADATA_PUBLISH_FAILED";
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<UpdateParams> }
): Promise<NextResponse<StandardPayload<ServerUpdateResponse | string>>> {
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
  if (attributes.inscription !== undefined) {
    if (typeof attributes.inscription !== "string") {
      return badRequest("Malformed inscription");
    }
    attributes.inscription = attributes.inscription.trim() || undefined;
    if (attributes.inscription && attributes.inscription.length > MAX_INSCRIPTION_LENGTH) {
      return badRequest(`Inscription cannot exceed ${MAX_INSCRIPTION_LENGTH} characters`);
    }
  }

  // Read first: need the already-claimed lockedSerial to re-publish
  // against, and the current CIDs so the old ones can be unpinned once
  // the new ones are safely in place. Not itself the real guard - the
  // conditional writes below are - just avoids wasted render/publish work
  // for a claim that's plainly not updatable.
  const performance = await getPerformance(showDate, parsedPosition);
  if (
    !performance ||
    performance.lockedBy !== accountId ||
    performance.serial ||
    !performance.lockedSerial
  ) {
    return success({ success: false, reason: "NOT_LOCKED" });
  }
  const { lockedSerial, imageCid: oldImageCid, metadataCid: oldMetadataCid, attributes: oldAttributes } = performance;

  const { imageCid: newImageCid, metadataCid: newMetadataCid } = await publishNftMetadata(
    hfbCollectionId,
    lockedSerial,
    showDate,
    parsedPosition,
    accountId,
    attributes,
    oldAttributes && oldImageCid ? { previousAttributes: oldAttributes, imageCid: oldImageCid } : undefined
  );
  // When only the inscription changed, publishNftMetadata reuses oldImageCid
  // as-is rather than publishing a new one - the unpin calls below must not
  // treat that reused CID as orphaned/superseded, since it's still (and was
  // always) the currently-referenced image.
  const imageWasReused = Boolean(newImageCid) && newImageCid === oldImageCid;

  if (!newImageCid || !newMetadataCid) {
    // publishNftMetadata never throws - always reports whatever it managed
    // to publish. Nothing's been persisted anywhere yet (unlike prepare,
    // which stores a lone imageCid for releaseClaim to find later) - this
    // item isn't being released, so a half-published attempt has nothing
    // to be found by. Unpin it directly instead of leaving it dangling.
    if (newImageCid && !imageWasReused) {
      const unpinned = await unpinFile(newImageCid);
      if (!unpinned) {
        console.error("Failed to unpin orphaned image from a failed update:", {
          showDate,
          position: parsedPosition,
          cid: newImageCid,
        });
      }
    }
    return success({ success: false, reason: "METADATA_PUBLISH_FAILED" });
  }

  const updateResult = await updateClaimedAttributes(showDate, parsedPosition, accountId, attributes);
  if (!updateResult.success) {
    // Lost the race - the claim moved on (released or sold) between the
    // read above and this write. The newly published metadata never got
    // referenced anywhere - unpin it rather than leave it orphaned. The
    // image is skipped when reused: it's still the one the still-current
    // record points to.
    await Promise.all([
      imageWasReused ? Promise.resolve(true) : unpinFile(newImageCid),
      unpinFile(newMetadataCid),
    ]);
    return success({ success: false, reason: "NOT_LOCKED" });
  }

  const setPublishedCidsResult = await setPublishedCids(showDate, parsedPosition, accountId, newImageCid, newMetadataCid);
  if (!setPublishedCidsResult.success) {
    console.error(`Failed to set published CIDs on update: ${setPublishedCidsResult.reason}`);
  }

  const metadataUpdateSuccess = await submitNftMetadataUpdate(
    hfbCollectionId,
    lockedSerial,
    newMetadataCid,
    showDate,
    parsedPosition,
    accountId,
    undefined,
    attributes.inscription
  );
  if (!metadataUpdateSuccess) {
    console.error("Failed to submit on-chain metadata update for an item update.");
    return success({ success: false, reason: "METADATA_PUBLISH_FAILED" });
  }

  // Everything downstream succeeded - the old CIDs are genuinely
  // superseded now, safe to unpin (unconditional/best-effort, same
  // posture as releaseClaim's own cleanup). Skip the image when it was
  // reused (inscription-only update) - oldImageCid === newImageCid there,
  // it's still in active use, not superseded.
  if (oldImageCid && !imageWasReused) {
    const unpinned = await unpinFile(oldImageCid);
    if (!unpinned) {
      console.error("Failed to unpin superseded image after update:", { showDate, position: parsedPosition, cid: oldImageCid });
    }
  }
  if (oldMetadataCid) {
    const unpinned = await unpinFile(oldMetadataCid);
    if (!unpinned) {
      console.error("Failed to unpin superseded metadata after update:", { showDate, position: parsedPosition, cid: oldMetadataCid });
    }
  }

  return success({ success: true });
}
