"use client";

import useSWR from "swr";
import { MintedPerformance } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";

export function useMintedPerformances() {
  const url = "/api/performances/minted";
  const { data, isLoading, error } = useSWR<MintedPerformance[]>(url, fetchStandardJson);
  return {
    mintedPerformances: data,
    mintedPerformancesLoading: isLoading,
    mintedPerformancesError: error,
  };
}
