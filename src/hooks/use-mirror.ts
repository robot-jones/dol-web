"use client";

import useSWR from "swr";
import { NftMetadata, MirrorNft } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";

// Not sortBySerialAscending (dol-lib) - serials are handed out from
// whatever's available at claim time, not assigned in mint order (that's
// deliberate, to minimize claim-time races - see the mint pipeline), so
// serial order doesn't reflect mint order. created_timestamp is the
// mirror node's own record of when each NFT was actually minted, already
// present on every MirrorNft with no extra fetch needed.
const sortByCreatedTimestampDescending = (a: MirrorNft, b: MirrorNft): number =>
  Number(b.created_timestamp) - Number(a.created_timestamp);

export function useIsTokenAssociated(
  tokenId: string,
  accountId: string | null
) {
  const { data, isLoading, error, mutate } = useSWR<boolean>(
    accountId ? `/api/mirror/accounts/${accountId}/tokens/${tokenId}` : null,
    fetchStandardJson
  );
  return {
    isAssociated: data,
    isAssociatedLoading: isLoading,
    isAssociatedError: error,
    mutateIsAssociated: mutate,
  };
}

export function useAccountNfts(tokenId: string, accountId: string | null) {
  const url = accountId
    ? `/api/mirror/accounts/${accountId}/nfts/${tokenId}`
    : null;
  const { data, isLoading, error } = useSWR<MirrorNft[]>(
    url,
    fetchStandardJson
  );
  return {
    nfts: data?.sort(sortByCreatedTimestampDescending),
    nftsLoading: isLoading,
    nftsError: error,
  };
}

export function useNftMetadata(tokenId: string, serial?: number) {
  const url = serial ? `/api/mirror/tokens/${tokenId}/nfts/${serial}` : null;
  const { data, isLoading, error } = useSWR<NftMetadata>(
    url,
    fetchStandardJson
  );
  return {
    metadata: data,
    metadataLoading: isLoading,
    metadataError: error,
  };
}
