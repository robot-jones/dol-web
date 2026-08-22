import { NextRequest, NextResponse } from "next/server";
import { Setlist } from "@erikmuir/dol-lib/types";
import { getSetlistsByShowDate, getSetlistsBySong } from "@erikmuir/dol-lib/server/api";
import { daysUntil } from "@erikmuir/dol-lib/utils";
import { StandardPayload, success } from "@/utils";

// /api/setlists/[dateOrSlug]

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ dateOrSlug: string }> }
): Promise<NextResponse<StandardPayload<Setlist[] | string>>> {
  const setlists: Setlist[] = [];
  try {
    const dateOrSlug = (await params).dateOrSlug;
    if (!dateOrSlug) throw new Error(`Missing date or slug.`);
    if (dateOrSlug.length < 3) throw new Error(`Invalid date or slug.`);
    const isDate = !isNaN(Date.parse(dateOrSlug));
    const action = isDate ? getSetlistsByShowDate : getSetlistsBySong;
    // Skip the 12h cache only for today's show, same as the [position]
    // route - song-slug lookups (history pages) have no "today" and stay
    // cache-first.
    const skipCache = isDate && daysUntil(dateOrSlug) === 0;
    const allSetlists = (await action(dateOrSlug, {}, skipCache)) || [];
    const filteredSetlists = allSetlists.filter((setlist) => setlist.artistId === 1);
    setlists.push(...filteredSetlists);
  } catch (e) {
    console.error(e);
  }
  return success(setlists);
}
