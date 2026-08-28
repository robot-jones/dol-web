import { twMerge } from "tailwind-merge";
import { Disclosure } from "@/components/common/Disclosure";

export type HowMintingWorksNoteProps = {
  show: boolean;
};

const getAttributeTypeLabel = (text: string, className?: string) => (
  <span className={twMerge("font-bold", className)}>{text}</span>
);

export const HowMintingWorksNote = ({ show }: HowMintingWorksNoteProps): React.ReactNode => {
  if (!show) return null;

  const customizable = getAttributeTypeLabel("Customizable", "text-dol-yellow");
  const fixed = getAttributeTypeLabel("Fixed", "text-dol-blue");
  const dynamic = getAttributeTypeLabel("Dynamic", "text-dol-green");
  const other = getAttributeTypeLabel("Other", "text-gray-medium");

  return (
    <Disclosure summary="How minting works" variant="subtle">
      <div className="text-justify pt-2">
        Feel free to modify or randomize the {customizable} attributes to your liking! When you mint,{" "}
        they&apos;ll be written to the NFT&apos;s metadata on chain, along with the {fixed} attributes{" "}
        — <em>including the MP3 link!</em> ({dynamic} and {other} attributes will not be written on chain,{" "}
        but can still be viewed on this page.)
      </div>
    </Disclosure>
  );
};
