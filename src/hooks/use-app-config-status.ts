"use client";

import useSWR from "swr";
import { AppConfigStatus } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";

// See PUNCHLIST.md Finding 28 - replaces the client-side
// NEXT_PUBLIC_MINT_ENABLED env-var read with a live fetch against
// dol-app-config, so the soft switch actually takes effect on the page
// without a redeploy. A fixed SWR key, unlike useAccountStatus - this
// isn't account-scoped, so it works the same whether or not a wallet is
// connected yet.
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
