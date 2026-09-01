import { useEffect, useState } from "react";
import Link from "next/link";
import { FaMinus, FaPlus, FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import {
  MdFirstPage,
  MdLastPage,
  MdNavigateBefore,
  MdNavigateNext,
} from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { getHashScanAccountUrl, getHashScanNftUrl, getHashScanUrl } from "@erikmuir/dol-lib/dapp";
import { chunkArray } from "@erikmuir/dol-lib/utils";
import { SearchBar } from "@/components/common/SearchBar";
import { useMintedPerformances } from "@/hooks/use-minted-performances";
import { formatShowDate } from "./format";
import { compareMintedPerformances, matchesSearch, SortDirection, SortKey } from "./sorting";

const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;

const PAGE_SIZE = 10;

// Widths set here, not on the data cells - table layout takes the widest
// declared width for a column from any row, same as LogSection.tsx. Every
// column gets an explicit width, summing to 100% - the table's `display:
// block` (needed for the sticky header/scroll) means an unconstrained
// column doesn't actually stretch to fill leftover space, it just shrinks
// to its own content like the others, leaving a blank gap.
const columns: { key: SortKey; label: string; width: string }[] = [
  { key: "mintedAt", label: "Date/Time", width: "w-[20%]" },
  { key: "date", label: "Show Date", width: "w-[12%]" },
  { key: "song", label: "Song", width: "w-[38%]" },
  { key: "serial", label: "Serial", width: "w-[10%]" },
  { key: "account", label: "Account", width: "w-[20%]" },
];

// Same date/time formatting LogSection.tsx uses for its own Date/Time
// column - kept consistent within this page rather than reused as a
// shared helper, matching LogSection's own inline convention.
const formatMintedAt = (mintedAt?: number): string => {
  if (!mintedAt) return "—";
  const date = new Date(mintedAt);
  return `${date.toLocaleDateString("en-US")} ${date.toTimeString().slice(0, 8)}`;
};

export const MintedPerformancesSection = (): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mintedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(0);
  const { mintedPerformances, mintedPerformancesLoading } = useMintedPerformances();

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, sortKey, sortDirection, mintedPerformances]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filtered = (mintedPerformances ?? []).filter((p) => matchesSearch(p, searchTerm));
  const sorted = [...filtered].sort(compareMintedPerformances(sortKey, sortDirection));
  const pages = chunkArray(sorted, PAGE_SIZE);
  const currentRows = pages[currentPage] || [];

  const noRow = "p-4 italic";
  const row = "px-4 py-2 text-xs";
  const border = "border-b border-gray-dark-2";
  const monospace = "font-mono";
  const header = "uppercase bg-dol-dark sticky top-0 bg-[#0a1a31]";
  const rows: React.ReactNode[] = [];

  if (mintedPerformancesLoading) {
    rows.push(
      <tr key="loading">
        <td className={noRow}>Loading...</td>
      </tr>
    );
  } else if (!mintedPerformances || mintedPerformances.length === 0) {
    rows.push(
      <tr key="empty">
        <td className={noRow}>No performances minted yet</td>
      </tr>
    );
  } else if (sorted.length === 0) {
    rows.push(
      <tr key="no-matches">
        <td className={noRow}>No matches for &ldquo;{searchTerm}&rdquo;</td>
      </tr>
    );
  } else {
    rows.push(
      <tr key="header">
        {columns.map(({ key, label, width }) => (
          <td
            key={key}
            className={twMerge(row, header, "cursor-pointer select-none", width)}
            onClick={() => handleSort(key)}
          >
            <span className="inline-flex items-center gap-1">
              {label}
              {sortKey !== key ? (
                <FaSort className="text-gray-medium" size={10} />
              ) : sortDirection === "asc" ? (
                <FaSortUp size={10} />
              ) : (
                <FaSortDown size={10} />
              )}
            </span>
          </td>
        ))}
      </tr>
    );
    rows.push(
      ...currentRows.map((performance) => (
        <tr key={performance.performanceId}>
          <td className={twMerge(row, border, monospace)}>
            {performance.transactionId ? (
              <a
                href={getHashScanUrl(performance.transactionId)}
                target="_blank"
                rel="noopener noreferrer"
                title="View transaction on HashScan"
                className="hover:text-dol-light hover:underline"
              >
                {formatMintedAt(performance.mintedAt)}
              </a>
            ) : (
              formatMintedAt(performance.mintedAt)
            )}
          </td>
          <td className={twMerge(row, border, monospace)}>
            <Link href={`/shows/${performance.showDate}`} className="hover:text-dol-light hover:underline">
              {formatShowDate(performance.showDate)}
            </Link>
          </td>
          <td className={twMerge(row, border, monospace)}>
            {performance.song ? (
              <Link
                href={`/shows/${performance.showDate}/${performance.position}`}
                className="hover:text-dol-light hover:underline"
              >
                {performance.song}
              </Link>
            ) : (
              "—"
            )}
          </td>
          <td className={twMerge(row, border, monospace)}>
            {performance.serial !== undefined && (
              <a
                href={getHashScanNftUrl(hfbCollectionId, performance.serial)}
                target="_blank"
                rel="noopener noreferrer"
                title="View on HashScan"
                className="hover:text-dol-light hover:underline"
              >
                {performance.serial}
              </a>
            )}
          </td>
          <td className={twMerge(row, border, monospace)}>
            {performance.lockedBy && (
              <a
                href={getHashScanAccountUrl(performance.lockedBy)}
                target="_blank"
                rel="noopener noreferrer"
                title="View on HashScan"
                className="hover:text-dol-light hover:underline"
              >
                {performance.lockedBy}
              </a>
            )}
          </td>
        </tr>
      ))
    );
  }

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  return (
    <div className="rounded w-full overflow-hidden border border-gray-dark-2">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="flex justify-between items-center cursor-pointer p-4 bg-gray-dark"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <h2 className="text-xl font-bold">Minted Performances</h2>
        <span className="text-gray-light">
          {isExpanded ? <FaMinus /> : <FaPlus />}
        </span>
      </div>
      {isExpanded && (
        <>
          <div className="p-2 bg-gray-dark border-t border-gray-dark-2">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by song, date, or account"
            />
          </div>
          <div className="max-h-[370px] overflow-auto">
            <table className="w-full">
              <tbody>{rows}</tbody>
            </table>
          </div>
          {pages.length > 1 && (
            <div className="flex justify-center items-center gap-0 p-0 bg-gray-dark-2">
              <button
                onClick={() => setCurrentPage(0)}
                disabled={isFirstPage}
                title="First Page"
                aria-label="First Page"
                className={twMerge(
                  "bg-transparent duration-500",
                  isFirstPage ? "text-gray-medium" : "text-dol-light",
                  isFirstPage ? "" : "hover:bg-dol-blue"
                )}
              >
                <MdFirstPage size={30} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={isFirstPage}
                title="Previous Page"
                aria-label="Previous Page"
                className={twMerge(
                  "bg-transparent duration-500",
                  isFirstPage ? "text-gray-medium" : "text-dol-light",
                  isFirstPage ? "" : "hover:bg-dol-blue"
                )}
              >
                <MdNavigateBefore size={30} />
              </button>

              <span className="text-sm px-2">
                Page {currentPage + 1} of {pages.length}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                disabled={isLastPage}
                title="Next Page"
                aria-label="Next Page"
                className={twMerge(
                  "bg-transparent duration-500",
                  isLastPage ? "text-gray-medium" : "text-dol-light",
                  isLastPage ? "" : "hover:bg-dol-blue"
                )}
              >
                <MdNavigateNext size={30} />
              </button>
              <button
                onClick={() => setCurrentPage(pages.length - 1)}
                disabled={isLastPage}
                title="Last Page"
                aria-label="Last Page"
                className={twMerge(
                  "bg-transparent duration-500",
                  isLastPage ? "text-gray-medium" : "text-dol-light",
                  isLastPage ? "" : "hover:bg-dol-blue"
                )}
              >
                <MdLastPage size={30} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
