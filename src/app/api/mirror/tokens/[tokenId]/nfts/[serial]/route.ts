import { NextRequest, NextResponse } from "next/server";
import { TokenNftInfo } from "@hashgraph/sdk";
import { NftMetadata } from "@erikmuir/dol-lib/types";
import { getMirrorClient } from "@erikmuir/dol-lib/server/api";
import { ServerEnvKeys, getRequired } from "@erikmuir/dol-lib/env";
import { success, StandardPayload, notFound, serverError } from "@/utils";

// /api/mirror/tokens/[tokenId]/nfts/[serial]

// Bug found live 2026-08-28 (surfaced first via a dol-bot admin script,
// then reproduced on this exact route): dol-lib's downloadMetadataFromPinata
// (the Pinata SDK's own dedicated-gateway client) doesn't reject cleanly
// when a CID isn't pinned under the currently-configured Pinata account -
// it's an unhandled rejection from inside the SDK itself. A bare Node
// script crashes outright on that; here it degrades to a bare 500 with no
// useful message instead, but the underlying problem is the same: content
// that's still perfectly retrievable via IPFS generally (anything pinned
// under a since-rotated/different Pinata account) comes back as a hard
// failure instead of actually being served.
//
// Bypasses the SDK entirely with plain fetch() against both gateways -
// the dedicated one first (the normal, fast path), a generic public
// Pinata gateway as fallback for exactly this class of failure.
const PUBLIC_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs";

async function downloadMetadataWithFallback(uriOrCid: string): Promise<NftMetadata | undefined> {
  const cid = uriOrCid.replace(/^ipfs:\/\//, "");
  const dedicatedGateway = getRequired(ServerEnvKeys.PINATA_GATEWAY);
  const gatewayUrls = [`https://${dedicatedGateway}/ipfs/${cid}`, `${PUBLIC_GATEWAY_URL}/${cid}`];
  for (const url of gatewayUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // try the next gateway
    }
  }
  return undefined;
}

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
  const metadata = await downloadMetadataWithFallback(metadataUri);
  if (!metadata) {
    return serverError("Failed to download NFT metadata from any gateway");
  }
  return success(metadata);
}
