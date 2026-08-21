import { useEffect, useState } from "react";
import { FaExternalLinkAlt, FaMinus, FaPlus } from "react-icons/fa";
import {
  MdFirstPage,
  MdLastPage,
  MdNavigateBefore,
  MdNavigateNext,
} from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { AuditLogData } from "@erikmuir/dol-lib/types";
import { chunkArray } from "@erikmuir/dol-lib/utils";
import {
  getHashScanUrl,
  getPerformanceId,
  sortByTimestampDescending,
} from "@erikmuir/dol-lib/dapp";
import {
  FailureStatusIcon,
  SuccessStatusIcon,
} from "@/components/common/StatusIcons";
import { useAuditLogs } from "@/hooks/use-audit-logs";

export type LogSectionProps = {
  title: string;
  logKey: string;
};

export const LogSection = ({
  title,
  logKey,
}: LogSectionProps): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pages, setPages] = useState<AuditLogData[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const { auditLogs, auditLogsLoading } = useAuditLogs(logKey);

  useEffect(() => {
    if (auditLogs) {
      const sortedLogs = [...auditLogs].sort(sortByTimestampDescending);
      const pageSize = 8;
      setPages(chunkArray(sortedLogs, pageSize));
      setCurrentPage(0); // Reset to first page when logs change
    }
  }, [auditLogs]);

  const currentLogs = pages[currentPage] || [];

  const goToFirstPage = () => {
    setCurrentPage(0);
  };
  const goToLastPage = () => {
    setCurrentPage(pages.length - 1);
  };
  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getLogContext = (log: AuditLogData): string => {
    const {
      onBehalfOfAccountId,
      tokenId,
      showDate,
      position,
      serial,
      serials,
      preRelease,
    } = log.context;
    const nftId = tokenId && serial ? `${tokenId}:${serial}` : "";
    const perfId =
      showDate && position ? getPerformanceId(showDate, position) : "";
    const onBehalfOf = onBehalfOfAccountId
      ? `on behalf of ${onBehalfOfAccountId}`
      : "";

    switch (log.action) {
      case "NFT_PURCHASE":
        return `${nftId} ${perfId}`;
      case "TOKEN_ASSOCIATE":
        return tokenId || "";
      case "TOKEN_METADATA_COMPOSE":
      case "TOKEN_METADATA_PUBLISH":
        return "[pre-release]";
      case "TOKEN_CREATE":
      case "INIT_DOL_SERIALS":
        return `[pre-release] ${tokenId || ""}`;
      case "IMAGE_PUBLISH":
      case "IMAGE_RENDER":
      case "NFT_METADATA_COMPOSE":
      case "NFT_METADATA_PUBLISH":
        return preRelease || !perfId ? "[pre-release]" : perfId;
      case "PERFORMANCE_CLAIM":
      case "PERFORMANCE_RELEASE":
        return `${perfId} ${onBehalfOf}`;
      case "SERIAL_CLAIM":
      case "SERIAL_RELEASE":
        return `${nftId} ${onBehalfOf}`;
      case "REFRESH_SHOW_DATA":
        return "[maintenance]";
      case "TOKEN_MINT_BATCH":
        return `[pre-release] ${tokenId} x${serials?.length || "?"}`;
      case "NFT_METADATA_UPDATE":
        return `${nftId} ${perfId} ${onBehalfOf}`;
      default:
        return ``;
    }
  };

  const noRow = "p-4 italic";
  const row = "px-4 py-2 text-xs";
  const border = "border-b border-gray-dark-2";
  const monospace = "font-mono";
  const header = "uppercase bg-dol-dark sticky top-0 bg-[#0a1a31]";
  const rows: React.ReactNode[] = [];

  if (auditLogsLoading) {
    rows.push(
      <tr key="loading">
        <td className={noRow}>Loading...</td>
      </tr>
    );
  } else if (auditLogs === undefined || auditLogs.length === 0) {
    rows.push(
      <tr key="empty">
        <td className={noRow}>No logs found</td>
      </tr>
    );
  } else {
    rows.push(
      <tr key="header">
        <td className={twMerge(row, header, "w-[20%]")}>Date/Time</td>
        <td className={twMerge(row, header, "w-[25%]")}>Action</td>
        <td className={twMerge(row, header)}>Context</td>
        <td className={twMerge(row, header, "w-[1%]")}></td>
        <td className={twMerge(row, header, "w-[1%]")}></td>
      </tr>
    );
    rows.push(
      ...currentLogs.map((log, index) => {
        const timestamp = new Date(log.timestamp);
        const dateTime = `${timestamp.toLocaleDateString("en-US")} ${timestamp
          .toTimeString()
          .slice(0, 8)}`;
        const { transactionId } = log.context;
        return (
          <tr
            key={index}
            className={twMerge(
              log.success ? "bg-dol-green/10" : "bg-dol-red/10"
            )}
          >
            <td className={twMerge(row, border, monospace)}>{dateTime}</td>
            <td className={twMerge(row, border, monospace)}>{log.action}</td>
            <td className={twMerge(row, border, monospace)}>
              {getLogContext(log)}
            </td>
            <td className={twMerge(row, border, monospace)}>
              {transactionId && (
                <a
                  href={getHashScanUrl(transactionId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on HashScan"
                  aria-label="View on HashScan"
                  className="text-gray-light hover:text-dol-light"
                >
                  <FaExternalLinkAlt size={12} />
                </a>
              )}
            </td>
            <td className={twMerge(row, border, monospace, "pr-4")}>
              {log.success ? <SuccessStatusIcon /> : <FailureStatusIcon />}
            </td>
          </tr>
        );
      })
    );
  }

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  return (
    <div className="rounded w-full max-h-[400px] overflow-hidden border border-gray-dark-2">
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
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-gray-light">
          {isExpanded ? <FaMinus /> : <FaPlus />}
        </span>
      </div>
      {isExpanded && (
        <>
          <table className="block w-full max-h-[303px] overflow-auto">
            <tbody>{rows}</tbody>
          </table>
          {pages.length > 1 && (
            <div className="flex justify-center items-center gap-0 p-0 bg-gray-dark-2">
              <button
                onClick={goToFirstPage}
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
                onClick={goToPrevPage}
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
                onClick={goToNextPage}
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
                onClick={goToLastPage}
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
