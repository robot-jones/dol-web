// Shared heuristic for "is this show recent enough that missing data (audio,
// setlist) might just not be uploaded yet" vs. "old enough that it's simply
// missing." A year is a generous window for phish.net/phish.in to catch up;
// past that we stop implying the data is still coming.
const RECENT_SHOW_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export const isRecentShow = (showDate?: string): boolean => {
  const showTime = showDate ? new Date(showDate).getTime() : NaN;
  return !Number.isNaN(showTime) && Date.now() - showTime <= RECENT_SHOW_MAX_AGE_MS;
};
