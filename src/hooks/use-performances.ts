"use client";

import useSWR from "swr";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";

export function usePerformances(showDate: string) {
  const url = `/api/performances/${showDate}`;
  const { data, isLoading, error } = useSWR<DolPerformance[]>(
    url,
    fetchStandardJson
  );
  return {
    performances: data,
    performancesLoading: isLoading,
    performancesError: error,
  };
}

export function usePerformance(showDate: string, position?: number) {
  const url = position ? `/api/performances/${showDate}/${position}` : null;
  const { data, isLoading, error, mutate } = useSWR<DolPerformance>(
    url,
    fetchStandardJson
  );
  return {
    performance: data,
    performanceLoading: isLoading,
    performanceError: error,
    mutatePerformance: mutate,
  };
}
