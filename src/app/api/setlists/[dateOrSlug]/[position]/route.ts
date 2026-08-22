import { NextRequest, NextResponse } from "next/server";
import { Setlist } from "@erikmuir/dol-lib/types";
import { getSetlistsByShowDate } from "@erikmuir/dol-lib/server/api";
import { daysUntil } from "@erikmuir/dol-lib/utils";
import { StandardPayload, success } from "@/utils";

// /api/setlists/[date]/[position]

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ dateOrSlug: string; position: string }> }
): Promise<NextResponse<StandardPayload<Setlist | string | undefined>>> {
  const artistId = 1; // only phish, for now
  let setlist: Setlist | undefined;
  try {
    const { dateOrSlug: date, position } = await params;
    if (!date || isNaN(Date.parse(date))) {
      throw new Error(`Invalid date: ${date}`);
    }
    // Skip the 12h cache for today's show - a cache entry populated before
    // a song is played would otherwise block minting it for hours (see
    // PUNCHLIST.md). Past/future shows stay cache-first.
    const skipCache = daysUntil(date) === 0;
    const setlists = (await getSetlistsByShowDate(date, {}, skipCache)) || [];
    setlist = setlists.find(
      (s) =>
        s.showDate === date &&
        `${s.position}` === position &&
        s.artistId === artistId
    );
  } catch (e) {
    console.error(e);
  }
  return success(setlist);
}
