import { NextResponse } from "next/server";
import { MintedPerformance } from "@erikmuir/dol-lib/types";
import { getMintedPerformances } from "@erikmuir/dol-lib/server/dapp";
import { StandardPayload, success } from "@/utils";

// /api/performances/minted

export async function GET(): Promise<NextResponse<StandardPayload<MintedPerformance[] | string>>> {
  try {
    const performances = await getMintedPerformances();
    return success(performances);
  } catch (e) {
    console.error(e);
    return success([]);
  }
}
