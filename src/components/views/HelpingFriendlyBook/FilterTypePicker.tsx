import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";

export enum FilterType {
  Date = "Dates",
  Song = "Songs",
  Location = "Locations",
}

export type FilterTypePickerProps = {
  disabled?: boolean;
};

export const FilterTypePicker = ({
  disabled,
}: FilterTypePickerProps): React.ReactElement => {
  const pathname = usePathname();
  const baseOptionClassName = twMerge(
    "py-1 w-1/3 text-center cursor-pointer",
    "border border-gray-dark-2",
    "transition duration-250"
  );
  return (
    <div className={twMerge(
      "w-72 mx-auto z-10",
      "flex items-center",
      "rounded-full bg-gray-dark shadow-lg",
    )}>
      <Link
        href="/book/songs"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={twMerge(
          baseOptionClassName,
          "rounded-l-full",
          pathname.startsWith("/book/songs") ? "bg-dol-blue" : "hover:bg-gray-dark-2",
          disabled ? "pointer-events-none" : ""
        )}
      >
        {FilterType.Song}
      </Link>
      <Link
        href="/book/dates"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={twMerge(
          baseOptionClassName,
          pathname.startsWith("/book/dates") ? "bg-dol-blue" : "hover:bg-gray-dark-2",
          disabled ? "pointer-events-none" : ""
        )}
      >
        {FilterType.Date}
      </Link>
      <Link
        href="/book/locations"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={twMerge(
          baseOptionClassName,
          "rounded-r-full",
          pathname.startsWith("/book/locations") ? "bg-dol-blue" : "hover:bg-gray-dark-2",
          disabled ? "pointer-events-none" : ""
        )}
      >
        {FilterType.Location}
      </Link>
    </div>
  );
};
