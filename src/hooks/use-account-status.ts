"use client";

import useSWR from "swr";
import { AccountStatus } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";

// See PUNCHLIST.md Finding 27 - replaces the client-side isWhiteList() env
// var read with a fetch against real account state.
export function useAccountStatus(accountId?: string | null) {
  const url = accountId ? `/api/account/${accountId}/status` : null;
  const { data, isLoading, error } = useSWR<AccountStatus>(
    url,
    fetchStandardJson
  );
  return {
    accountStatus: data,
    accountStatusLoading: isLoading,
    accountStatusError: error,
  };
}
