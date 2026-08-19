import { MdAutorenew } from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { DolColorHex, Subject } from "@erikmuir/dol-lib/types";
import {
  DropDownAttribute,
  DropDownOption,
} from "../AttributeTypes/DropDownAttribute";

const getDolColorOptions = (): DropDownOption[] => [
  { label: "Blue", value: DolColorHex.Blue },
  { label: "Green", value: DolColorHex.Green },
  { label: "Red", value: DolColorHex.Red },
  { label: "Yellow", value: DolColorHex.Yellow },
  { label: "Dark", value: DolColorHex.Dark },
  { label: "Light", value: DolColorHex.Light },
];

const getSubjectOptions = (): DropDownOption[] => [
  { label: "HFB", value: Subject.HelpingFriendlyBook },
  { label: "Lizard", value: Subject.Lizard },
  { label: "Mockingbird", value: Subject.FamousMockingbird },
  { label: "Llama", value: Subject.Llama },
  { label: "Sloth", value: Subject.Sloth },
  { label: "Multibeast", value: Subject.Multibeast },
  { label: "Harpua", value: Subject.Harpua },
  { label: "PosterNutbag", value: Subject.PosterNutbag },
];

export type ImageAttributesProps = {
  bgColor: DolColorHex;
  donut?: DolColorHex;
  subject?: Subject;
  minted?: boolean;
  handleBgColorChanged: (bgColor?: string) => void;
  handleDonutChanged: (donut?: string) => void;
  handleSubjectChanged: (subject?: string) => void;
  handleRandomizeClick: (event: React.MouseEvent) => void;
  handleRandomizeKeyDown: (event: React.KeyboardEvent) => void;
};

export const ImageAttributes = ({
  bgColor,
  donut,
  subject,
  minted,
  handleBgColorChanged,
  handleDonutChanged,
  handleSubjectChanged,
  handleRandomizeClick,
  handleRandomizeKeyDown,
}: ImageAttributesProps): React.ReactNode => {
  return (
    <div className="flex flex-wrap justify-center gap-2 items-center w-full max-w-[640px] mx-auto">
      <DropDownAttribute
        id="background-attribute"
        label="Background"
        currentValue={bgColor}
        options={getDolColorOptions()}
        onChange={handleBgColorChanged}
        attributeColor={"yellow"}
        disabled={minted}
      />
      <DropDownAttribute
        id="donut-attribute"
        label="Donut"
        currentValue={donut}
        options={getDolColorOptions()}
        onChange={handleDonutChanged}
        attributeColor={"yellow"}
        nullOptionLabel="None"
        disabled={minted}
      />
      <DropDownAttribute
        id="subject-attribute"
        label="Subject"
        currentValue={subject}
        options={getSubjectOptions()}
        onChange={handleSubjectChanged}
        attributeColor={"yellow"}
        nullOptionLabel="None"
        disabled={minted}
      />
      {!minted && (
        <MdAutorenew
          size={40}
          className={twMerge(
            "ml-2 p-[6px] shadow-md rounded-full cursor-pointer",
            "animate-color-cycle",
          )}
          title="Randomize"
          role="button"
          aria-label="Randomize"
          onClick={handleRandomizeClick}
          onKeyDown={handleRandomizeKeyDown}
          tabIndex={0}
        />
      )}
    </div>
  );
};
