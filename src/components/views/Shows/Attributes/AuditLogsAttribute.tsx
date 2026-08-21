import { useEffect, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { twMerge } from "tailwind-merge";
import { Setlist } from "@erikmuir/dol-lib/types";
import { getHashScanUrl } from "@erikmuir/dol-lib/dapp";
import {
  FailureStatusIcon,
  SuccessStatusIcon,
} from "@/components/common/StatusIcons";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { TableAttribute } from "../AttributeTypes";

export type AuditLogsAttributeProps = {
  setlist?: Setlist;
  setlistLoading?: boolean;
};

export const AuditLogsAttribute = ({
  setlist,
  setlistLoading,
}: AuditLogsAttributeProps) => {
  const [auditLogKey, setAuditLogKey] = useState<string>();
  const { auditLogs, auditLogsLoading } = useAuditLogs(auditLogKey);

  useEffect(() => {
    if (setlist) {
      setAuditLogKey(`${setlist.showDate}:${setlist.position}`);
    }
  }, [setlist]);

  const header = "uppercase bg-dol-dark sticky top-0 bg-[#1a2a41]";
  const row = "px-2 py-2 text-xs";
  const border = "border-b border-gray-dark-2";
  const monospace = "font-mono";
  const rows: React.ReactNode[] = [
    <tr key="0">
      <td className={twMerge(row, border, header, "w-[30%]")}>Date/Time</td>
      <td className={twMerge(row, border, header, "w-[20%]")}>Account</td>
      <td className={twMerge(row, border, header)}>Action</td>
      <td className={twMerge(row, border, header, "w-[1%]")}></td>
      <td className={twMerge(row, border, header, "w-[1%]")}></td>
    </tr>,
  ];
  if (auditLogs && auditLogs.length > 0) {
    rows.push(
      auditLogs
        ?.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
        .map((log, index) => {
          const timestamp = new Date(log.timestamp);
          const dateString = timestamp.toLocaleDateString("en-US");
          const timeString = timestamp.toTimeString().slice(0, 8);
          const dateTime = `${dateString} ${timeString}`;
          const accountIdText =
            log.accountId === `${process.env.NEXT_PUBLIC_TREASURY_ACCOUNT}` ? "SYSTEM" : log.accountId;
          const { transactionId } = log.context;
          return (
            <tr key={index} className={log.success ? "" : "bg-dol-red/10"}>
              <td className={twMerge(row, border, monospace)}>{dateTime}</td>
              <td className={twMerge(row, border, monospace)}>
                {accountIdText}
              </td>
              <td className={twMerge(row, border, monospace)}>{log.action}</td>
              <td className={twMerge(row, border, monospace, "w-[1%] pr-4")}>
                {log.success ? <SuccessStatusIcon /> : <FailureStatusIcon />}
              </td>
              <td className={twMerge(row, border, monospace, "w-[1%] pr-4")}>
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
            </tr>
          );
        })
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 items-center w-full max-w-[640px] mx-auto">
      <TableAttribute
        rows={rows}
        loading={setlistLoading || auditLogsLoading}
        attributeColor={"dark"}
        fullWidth
        header
      />
    </div>
  );
};
