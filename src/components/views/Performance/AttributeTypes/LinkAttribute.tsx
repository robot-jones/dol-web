import { FaLink } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { BaseAttributeProps } from "./types";

export type LinkAttributeProps = BaseAttributeProps & {
  href?: string;
};

export const LinkAttribute = ({
  label,
  href,
  loading,
  textColor = "light",
  attributeColor,
}: LinkAttributeProps): React.ReactNode => {
  const linkStyles = "rounded-full p-[3px] hover:scale-125 duration-300";

  const getContent = () => {
    if (loading) {
      return <AnimatedDonut sizeInPixels={20} className="mt-[2px]" />;
    }

    if (!href) {
      return <div className="text-gray-medium">--null--</div>;
    }

    if (href.startsWith("/")) {
      return (
        <Link href={href} className={twMerge(linkStyles, "bg-dol-light")}>
          <Image
            src="/logo.png"
            width={12}
            height={12}
            alt="Duke of Lizards logo"
            className="drop-shadow"
          />
        </Link>
      );
    }

    if (href.startsWith("https://phish.net")) {
      return (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={href}
          className={twMerge(linkStyles, "bg-white")}
        >
          <Image
            src="/phish-net-logo.png"
            width={12}
            height={12}
            alt="Phish.net logo"
            className="drop-shadow"
          />
        </a>
      );
    }

    if (href.startsWith("https://phish.in")) {
      return (
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={href}
          className={twMerge(linkStyles, "bg-gray-light")}
        >
          <Image
            src="/phish-in.ico"
            width={12}
            height={12}
            alt="Phish.in logo"
            className="drop-shadow"
          />
        </a>
      );
    }

    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={href}
        className={getTwDolColor(textColor, TwColorClassPrefix.Text)}
      >
        <FaLink size={24} />
      </a>
    );
  };

  return (
    <div
      className={twMerge(
        "border rounded p-2 whitespace-nowrap text-center self-stretch",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Border) : "border-gray-medium",
        attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Background, 25) : "bg-gray-dark/75",
      )}
    >
      {label && (
        <div
          className={twMerge(
            "text-[10px] uppercase",
            getLabelTextColorClass(attributeColor)
          )}
        >
          {label}
        </div>
      )}
      <div className="flex items-center justify-center font-mono gap-2 mt-[3px]">
        {getContent()}
      </div>
    </div>
  );
};
