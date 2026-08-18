import { NextResponse } from "next/server";
import { Song } from "@erikmuir/dol-lib/types";
import { StandardPayload, success } from "@/utils";
import { getSongs } from "@erikmuir/dol-lib/server/api";

// /api/songs

export async function GET(): Promise<NextResponse<StandardPayload<Song[] | string>>> {
  const songs: Song[] = [];
  try {
    const allSongs = await getSongs();
    if (allSongs && allSongs.length > 0) {
      const distinctSongs = allSongs.filter((s, index, self) =>
        index === self.findIndex((t) => t.songId === s.songId)
      );
      songs.push(...distinctSongs);
    }
  } catch (e) {
    console.error(e);
  }
  return success(songs);
}
