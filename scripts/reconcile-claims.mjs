#!/usr/bin/env node
// Manual reconciliation script for stuck mint claims - see PUNCHLIST.md
// Phase 2. A performance is "stuck" if it was claimed pre-transfer but
// never finalized - e.g. the buyer's tab closed before the post-transfer
// call completed. There's no TTL, so these don't self-heal; that's the
// deliberate tradeoff for a low-traffic project (see PUNCHLIST.md's Phase
// 2 intro) - most claims finish in seconds, so anything left here is worth
// a human look before releasing it.
//
// Requires the same .env this app already uses (AWS creds,
// NEXT_PUBLIC_HFB_COLLECTION_ID) - run from the dol-web repo root.
//
// Usage:
//   node scripts/reconcile-claims.mjs
//     List stuck claims.
//
//   node scripts/reconcile-claims.mjs --release <showDate> <position>
//     Release one stuck claim (both the performance and its serial) so the
//     performance can be minted again. Only acts on a claim that's
//     actually stuck - refuses if the performance was already sold.

import {
  queryUnfinalizedClaims,
  unlockPerformance,
  releaseSerial,
} from "@erikmuir/dol-lib/server/dynamo";
import { EnvKeys, getRequired } from "@erikmuir/dol-lib/env";

async function list() {
  const stuck = await queryUnfinalizedClaims();
  if (stuck.length === 0) {
    console.log("No stuck claims found.");
    return;
  }
  console.log(`Found ${stuck.length} stuck claim(s):\n`);
  for (const p of stuck) {
    console.log(
      `- ${p.showDate} #${p.position} (${p.performanceId}): claimed by ${p.lockedBy}, serial ${p.lockedSerial}, metadataCid ${p.metadataCid ? "set" : "MISSING"}`
    );
  }
  console.log(
    "\nTo release one so it can be minted again:\n" +
      "  node scripts/reconcile-claims.mjs --release <showDate> <position>"
  );
}

async function release(showDate, positionArg) {
  const position = parseInt(positionArg, 10);
  const hfbCollectionId = getRequired(EnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);

  const stuck = await queryUnfinalizedClaims();
  const match = stuck.find((p) => p.showDate === showDate && p.position === position);
  if (!match) {
    console.log(`No stuck claim found for ${showDate} #${position}. Nothing to do.`);
    return;
  }

  console.log(
    `Releasing ${showDate} #${position} (claimed by ${match.lockedBy}, serial ${match.lockedSerial})...`
  );
  const performanceResult = await unlockPerformance(showDate, position, match.lockedBy);
  console.log("  performance release:", performanceResult);

  if (match.lockedSerial) {
    const serialResult = await releaseSerial(hfbCollectionId, match.lockedSerial, match.performanceId);
    console.log("  serial release:", serialResult);
  }
}

async function main() {
  const [, , flag, showDate, position] = process.argv;
  if (flag === "--release") {
    if (!showDate || !position) {
      console.error("Usage: node scripts/reconcile-claims.mjs --release <showDate> <position>");
      process.exit(1);
    }
    await release(showDate, position);
  } else {
    await list();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
