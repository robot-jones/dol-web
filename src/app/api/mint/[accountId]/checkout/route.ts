import { NextRequest, NextResponse } from "next/server";
import { Hbar, TransferTransaction } from "@hashgraph/sdk";
import { PublicEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { Uint8ArrayWrapper } from "@erikmuir/dol-lib/types";
import { getHederaClient } from "@erikmuir/dol-lib/server/blockchain";
import { getPerformance } from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, StandardPayload, success } from "@/utils";
import { canMint } from "@/mint-gate";

// /api/mint/[accountId]/checkout
//
// AC/DC Bag (CART.md, checklist item 2): given a list of this account's
// already-prepared items (see ../[showDate]/[position]/prepare/route.ts),
// re-verify each is still lockedBy this account with no serial set -
// defends against the 15-minute stuck-claim sweep reclaiming something
// mid-shop - then builds ONE TransferTransaction covering every item
// that's still good, signs it with the operator, and returns txBytes.
// Any item that no longer verifies is dropped and reported back rather
// than failing the whole checkout.
//
// No maxDuration override: unlike prepare, this does no rendering or IPFS
// work - just Dynamo reads and signing an already-built transaction, well
// within Vercel's 10s default.

export type CheckoutParams = {
  accountId: string;
};

export type CheckoutItem = {
  showDate: string;
  position: number;
};

export type CheckoutRequestBody = {
  items: CheckoutItem[];
};

export type ServerCheckoutResponse = {
  txBytes?: Uint8ArrayWrapper;
  confirmed: CheckoutItem[];
  expired: CheckoutItem[];
};

// Hedera Token Service's own per-transfer NFT limit - same ceiling
// dol-lib's claimPerformance enforces per-account via countLockedPerformances,
// checked again here defensively against a malformed/tampered request body.
const MAX_CHECKOUT_ITEMS = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<CheckoutParams> }
): Promise<NextResponse<StandardPayload<ServerCheckoutResponse | string>>> {
  const { accountId } = await params;

  const hfbHbarPrice = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_HBAR_PRICE);
  const treasuryAccount = getRequired(PublicEnvKeys.NEXT_PUBLIC_TREASURY_ACCOUNT);
  const hfbCollectionId = getRequired(PublicEnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);

  if (!(await canMint(accountId))) {
    return badRequest("Minting is disabled");
  }

  const body: CheckoutRequestBody = await req.json();
  const items = body?.items;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return badRequest("No items provided");
  }
  if (items.length > MAX_CHECKOUT_ITEMS) {
    return badRequest(`Cannot check out more than ${MAX_CHECKOUT_ITEMS} items at once`);
  }
  if (items.some((item) => typeof item?.showDate !== "string" || typeof item?.position !== "number")) {
    return badRequest("Malformed item in request body");
  }

  const verifications = await Promise.all(
    items.map(async (item) => {
      const performance = await getPerformance(item.showDate, item.position);
      const stillGood =
        performance?.lockedBy === accountId &&
        performance?.lockedSerial != null &&
        !performance?.serial;
      return { item, stillGood, serial: performance?.lockedSerial };
    })
  );

  const confirmed = verifications.filter((v) => v.stillGood);
  const expired = verifications.filter((v) => !v.stillGood).map((v) => v.item);

  if (confirmed.length === 0) {
    return success({ confirmed: [], expired });
  }

  const client = getHederaClient();

  let transaction = new TransferTransaction();
  for (const { serial } of confirmed) {
    transaction = transaction
      .addHbarTransfer(accountId, new Hbar(-hfbHbarPrice))
      .addHbarTransfer(treasuryAccount, new Hbar(hfbHbarPrice))
      .addNftTransfer(hfbCollectionId, serial!, treasuryAccount, accountId);
  }
  transaction = transaction.freezeWith(client);
  const signedTx = await transaction.signWithOperator(client);
  // Explicit { type: "Buffer", data: [...] } shape, not a raw Uint8Array -
  // JSON.stringify on a bare Uint8Array produces {"0":n,"1":n,...}, which
  // the client's `new Uint8Array(txBytes.data)` can't reconstruct.
  const txBytes: Uint8ArrayWrapper = {
    type: "Buffer",
    data: Array.from(signedTx.toBytes()),
  };

  return success({
    txBytes,
    confirmed: confirmed.map((c) => c.item),
    expired,
  });
}
