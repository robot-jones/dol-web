"use client";

import useSWR from "swr";
import { AppConfigStatus } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";

// Fixed SWR key, unlike useAccountStatus - not account-scoped, so it
// works the same whether or not a wallet is connected yet.
export function useAppConfigStatus() {
  const { data, isLoading, error } = useSWR<AppConfigStatus>(
    "/api/config/status",
    fetchStandardJson
  );
  return {
    appConfigStatus: data,
    appConfigStatusLoading: isLoading,
    appConfigStatusError: error,
  };
}
