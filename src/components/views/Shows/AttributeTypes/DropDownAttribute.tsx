import { twMerge } from "tailwind-merge";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { BaseAttributeProps } from "./types";

export type DropDownOption = {
  label: string;
  value?: string;
};

export type DropDownAttributeProps = BaseAttributeProps & {
  id: string;
  options?: DropDownOption[];
  currentValue?: string;
  onChange: (value?: string) => void;
  disabled?: boolean;
  nullOptionLabel?: string;
};

export const DropDownAttribute = ({
  id,
  label,
  options,
  currentValue,
  onChange,
  loading,
  attributeColor,
  fullWidth,
  disabled,
  nullOptionLabel,
}: DropDownAttributeProps): React.ReactNode => {
  if (nullOptionLabel) {
    options = [
      { label: nullOptionLabel, value: undefined },
      ...(options || []),
    ];
  }
  return (
    <div
      className={twMerge(
        "border rounded p-2 whitespace-nowrap text-center self-stretch",
        fullWidth ? "w-full" : "w-fit",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Border) : "border-gray-medium",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Background, 25) : "bg-gray-dark/75",
      )}
    >
      {label && (
        <label
          htmlFor={id}
          className={twMerge(
            "block text-[10px] uppercase pb-1",
            getLabelTextColorClass(attributeColor)
          )}
        >
          {label}
        </label>
      )}
      <div
        className={twMerge(
          "flex flex-col items-center justify-center font-mono"
        )}
      >
        <select
          id={id}
          className={twMerge(
            "border rounded p-1 text-sm text-dol-dark",
            loading || disabled ? "bg-gray-medium" : ""
          )}
          onChange={(e) => onChange(e.target.value)}
          value={currentValue || ""}
          disabled={loading || disabled}
        >
          {options &&
            options.map((option) => (
              <option key={`${label}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};
