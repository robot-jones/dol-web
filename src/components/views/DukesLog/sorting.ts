import { MintedPerformance } from "@erikmuir/dol-lib/types";

export type SortKey = "mintedAt" | "date" | "song" | "serial" | "account";
export type SortDirection = "asc" | "desc";

export const matchesSearch = (
  performance: MintedPerformance,
  searchTerm: string
): boolean => {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    performance.showDate,
    performance.song,
    performance.venue,
    performance.lockedBy,
    `${performance.serial ?? ""}`,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
};

export const compareMintedPerformances = (
  sortKey: SortKey,
  sortDirection: SortDirection
) => {
  const direction = sortDirection === "asc" ? 1 : -1;
  return (a: MintedPerformance, b: MintedPerformance): number => {
    switch (sortKey) {
      case "mintedAt":
        return direction * ((a.mintedAt ?? 0) - (b.mintedAt ?? 0));
      case "song":
        return direction * (a.song ?? "").localeCompare(b.song ?? "");
      case "serial":
        return direction * ((a.serial ?? 0) - (b.serial ?? 0));
      case "account":
        return direction * (a.lockedBy ?? "").localeCompare(b.lockedBy ?? "");
      case "date":
      default:
        // Same showDate stays grouped by position rather than falling back
        // to insertion order, which a plain date-only compare would leave
        // unstable across renders.
        if (a.showDate !== b.showDate) {
          return direction * (a.showDate < b.showDate ? -1 : 1);
        }
        return direction * (a.position - b.position);
    }
  };
};
