import { twMerge } from "tailwind-merge";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { BaseAttributeProps } from "./types";

export type TableAttributeProps = BaseAttributeProps & {
  rows?: React.ReactNode[];
  header?: boolean;
};

export const TableAttribute = ({
  label,
  rows = [],
  loading,
  attributeColor,
  fullWidth,
  header,
}: TableAttributeProps): React.ReactNode => {
  const hasData = rows.length > (header ? 1 : 0);
  const getContent = () => {
    if (loading) {
      return (
        <tr>
          <td className="px-4 py-2 text-center mx-auto">
            <AnimatedDonut sizeInPixels={20} />
          </td>
        </tr>
      );
    }

    if (rows.length === 0 || (header && rows.length === 1)) {
      return (
        <tr>
          <td className="px-4 py-2 text-gray-medium font-mono text-center">
            --null--
          </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <div
      className={twMerge(
        "max-h-96 border rounded whitespace-nowrap self-stretch",
        fullWidth ? "w-full" : "",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Border) : "border-gray-medium",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Background, 25) : "bg-gray-dark/75",
      )}
    >
      {label && (
        <div
          className={twMerge(
            "text-[10px] uppercase text-center",
            getLabelTextColorClass(attributeColor)
          )}
        >
          {label}
        </div>
      )}
      <div className="w-full h-full overflow-y-auto">
        <table
          className={twMerge(
            "w-full max-h-[303px] rounded overflow-auto",
            hasData ? "block" : "table"
          )}
        >
          <tbody>{getContent()}</tbody>
        </table>
      </div>
    </div>
  );
};
