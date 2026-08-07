import { twMerge } from "tailwind-merge";
import { DolColorExtended, DolSize } from "@erikmuir/dol-lib/types";
import Link from "next/link";

export interface DolButtonProps {
  size?: DolSize;
  color?: DolColorExtended;
  href?: string;
  roundedFull?: boolean;
  fullWidth?: boolean;
  outline?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

export const DolButton = ({
  size = "md",
  color = "gray",
  href,
  roundedFull = false,
  fullWidth = false,
  outline = false,
  disabled = false,
  className = "",
  onClick,
  children
}: DolButtonProps) => {

  let sizeClasses = "";
  let textColor = "text-dol-light";
  let textHoverColor = "hover:text-white";
  let backgroundColor = "";
  let backgroundHoverColor = "";
  let borderColor = "";

  switch (size) {
    case "sm": sizeClasses = "text-xs py-1 tracking-wide"; break;
    case "md": sizeClasses = "text-xs py-2 tracking-wider"; break;
    case "lg": sizeClasses = "text-lg py-3 tracking-widest"; break;
    default: sizeClasses = ""; break;
  }

  switch (color) {
    case "blue":
      backgroundColor = "bg-dol-blue/50";
      backgroundHoverColor = "hover:bg-dol-blue/75";
      borderColor = "border-dol-blue";
      break;
    case "green":
      backgroundColor = "bg-dol-green/50";
      backgroundHoverColor = "hover:bg-dol-green/75";
      borderColor = "border-dol-green";
      break;
    case "red":
      backgroundColor = "bg-dol-red/50";
      backgroundHoverColor = "hover:bg-dol-red/75";
      borderColor = "border-dol-red";
      break;
    case "yellow":
      backgroundColor = "bg-dol-yellow/50";
      backgroundHoverColor = "hover:bg-dol-yellow/75";
      borderColor = "border-dol-yellow";
      break;
    case "dark":
      backgroundColor = "bg-dol-dark/50";
      backgroundHoverColor = "hover:bg-dol-dark/75";
      borderColor = "border-dol-dark";
      break;
    case "light":
      textColor = "text-dol-dark/50";
      textHoverColor = "hover:text-dol-dark";
      backgroundColor = "bg-dol-light/50";
      backgroundHoverColor = "hover:bg-dol-light/75";
      borderColor = "border-dol-light";
      break;
    default:
      backgroundColor = "bg-gray-medium/25";
      backgroundHoverColor = "hover:bg-gray-medium";
      borderColor = "border-gray-medium";
      break;
  }

  textColor = disabled ? "text-gray-medium" : textColor;
  textHoverColor = disabled ? "hover:text-gray-medium" : textHoverColor;
  backgroundColor = outline ? "bg-transparent" : backgroundColor;
  backgroundColor = disabled ? "bg-gray-medium/25" : backgroundColor;
  backgroundHoverColor = disabled ? "opacity-50 cursor-not-allowed" : backgroundHoverColor;
  borderColor = outline ? `border ${borderColor}` : "";

  const mergedClassName = twMerge(
    sizeClasses,
    textColor,
    textHoverColor,
    backgroundColor,
    backgroundHoverColor,
    borderColor,
    roundedFull ? "rounded-full" : "rounded",
    fullWidth ? "w-full" : "w-auto",
    "px-4 text-center uppercase duration-500 transition ease-in-out",
    className
  );

  return href
    ? <Link href={disabled ? "#" : href} className={mergedClassName} onClick={onClick}>{children}</Link>
    : <button type="button" className={mergedClassName} onClick={onClick} disabled={disabled}>{children}</button>;
};
