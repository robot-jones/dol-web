import { useEffect, useRef } from "react";
import { FaSearch } from "react-icons/fa";
import { twMerge } from "tailwind-merge";

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export const SearchBar = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: SearchBarProps): React.ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div
      role="search"
      onClick={() => inputRef.current?.focus()}
      className={twMerge(
        "relative inline-flex items-center mx-auto w-full px-4 py-1.5",
        "bg-gray-extra-dark border border-gray-dark-2 rounded-full",
        "focus-within:ring-2 focus-within:ring-dol-blue focus-within:border-dol-blue",
        "transition-colors duration-200",
        disabled ? "cursor-not-allowed" : "",
        className
      )}
    >
      <FaSearch
        size={18}
        className={twMerge(
          "pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-medium"
        )}
      />
      <input
        type="text"
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={placeholder || "Search"}
        className={twMerge(
          "w-full bg-transparent pl-6 pr-2 text-gray-light placeholder-gray-medium",
          "appearance-none outline-none ring-0 border-0",
        )}
      />
    </div>
  );
};
