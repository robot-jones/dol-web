import { daysUntil } from "@erikmuir/dol-lib/utils";

// Shared heuristic for "is this show recent enough that missing data (audio,
// setlist) might just not be uploaded yet" vs. "old enough that it's simply
// missing." A year is a generous window for phish.net/phish.in to catch up;
// past that we stop implying the data is still coming.
const RECENT_SHOW_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export const isRecentShow = (showDate?: string): boolean => {
  const showTime = showDate ? new Date(showDate).getTime() : NaN;
  return !Number.isNaN(showTime) && Date.now() - showTime <= RECENT_SHOW_MAX_AGE_MS;
};

// "Is this the date a show is actively happening" - deliberately not
// `daysUntil(showDate) === 0`. `daysUntil` compares local calendar days,
// and "local" on Vercel is UTC (no TZ configured anywhere in this repo) -
// so for any US show, the calendar day server-side rolls over mid-show,
// right around door time (e.g. 7PM Central = midnight UTC). A strict
// same-day check goes false exactly then, re-enabling the 12h setlist
// cache at the worst possible moment (see PUNCHLIST.md Finding 58 - this
// is that same bug, reintroduced by a timezone edge case). A US show's
// local date can only equal UTC's or trail it by one day, never lead it,
// so treating "today or yesterday" (in UTC-day terms) as live is safe and
// can't misfire on unrelated dates.
export const isShowDay = (showDate?: string): boolean => {
  if (!showDate) return false;
  const diff = daysUntil(showDate);
  return diff === 0 || diff === -1;
};
