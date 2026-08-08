import { NextRequest, NextResponse } from "next/server";
import { TokenNftInfo } from "@hashgraph/sdk";
import { NftMetadata } from "@erikmuir/dol-lib/types";
import { getMirrorClient } from "@erikmuir/dol-lib/server/api";
import { downloadMetadataFromPinata } from "@erikmuir/dol-lib/server/blockchain";
import { success, StandardPayload, notFound } from "@/utils";

// /api/mirror/tokens/[tokenId]/nfts/[serial]

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ tokenId: string; serial: string }> }
): Promise<NextResponse<StandardPayload<NftMetadata | string>>> {
  const { tokenId, serial } = await params;
  const tokenNftInfo: TokenNftInfo = await getMirrorClient().getNftInfo(
    tokenId,
    parseInt(serial)
  );
  if (!tokenNftInfo?.metadata) {
    return notFound("NFT metadata not found");
  }
  const metadataUri = atob(Buffer.from(tokenNftInfo.metadata).toString("utf8"));
  const metadata = await downloadMetadataFromPinata<NftMetadata>(metadataUri);
  return success(metadata);
}
