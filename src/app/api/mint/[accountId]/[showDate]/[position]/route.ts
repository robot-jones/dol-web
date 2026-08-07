import { NextRequest, NextResponse } from "next/server";
import { Hbar, TransferTransaction } from "@hashgraph/sdk";
import { EnvKeys, getBoolean, getRequired } from "@erikmuir/dol-lib/env";
import { PerformanceAttributes, SerialErrorResponse } from "@erikmuir/dol-lib/types";
import { getHederaClient } from "@erikmuir/dol-lib/server/blockchain";
import { obtainLock } from "@erikmuir/dol-lib/server/dapp";
import { badRequest, StandardPayload, success } from "@/utils";
import { isWhiteList } from "@/env";

// /api/mint/[accountId]/[showDate]/[position] (pre-transfer endpoint)

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
  
  const mintEnabled = getBoolean(EnvKeys.NEXT_PUBLIC_MINT_ENABLED);
  const hfbHbarPrice = getRequired(EnvKeys.NEXT_PUBLIC_HFB_HBAR_PRICE);
  const treasuryAccount = getRequired(EnvKeys.NEXT_PUBLIC_TREASURY_ACCOUNT);
  const hfbCollectionId = getRequired(EnvKeys.NEXT_PUBLIC_HFB_COLLECTION_ID);

  if (!mintEnabled && !isWhiteList(accountId)) {
    return badRequest("Minting is disabled");
  }

  const attributes: PerformanceAttributes = await req.json();
  if (!attributes) {
    return badRequest("No attributes provided");
  }

  const serial = await obtainLock(
    accountId,
    showDate,
    parseInt(position),
    attributes
  );

  if (serial <= 0) {
    return success({ serial });
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
