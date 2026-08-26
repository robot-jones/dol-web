import Image from "next/image";
import { MdAutorenew } from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { DolColorHex, Subject } from "@erikmuir/dol-lib/types";
import { getDolColorDisplayName, getDolColorFromHexValue } from "@erikmuir/dol-lib/dapp";
import {
  AttributePickerShell,
  PickerOption,
} from "../AttributeTypes/AttributePickerShell";
import { DataAttribute } from "../AttributeTypes/DataAttribute";

const getDolColorOptions = (): PickerOption<DolColorHex>[] => [
  { label: "Blue", value: DolColorHex.Blue },
  { label: "Green", value: DolColorHex.Green },
  { label: "Red", value: DolColorHex.Red },
  { label: "Yellow", value: DolColorHex.Yellow },
  { label: "Dark", value: DolColorHex.Dark },
  { label: "Light", value: DolColorHex.Light },
];

const getSubjectOptions = (): PickerOption<Subject>[] => [
  { label: "HFB", value: Subject.HelpingFriendlyBook },
  { label: "Lizard", value: Subject.Lizard },
  { label: "Mockingbird", value: Subject.FamousMockingbird },
  { label: "Llama", value: Subject.Llama },
  { label: "Sloth", value: Subject.Sloth },
  { label: "Multibeast", value: Subject.Multibeast },
  { label: "Harpua", value: Subject.Harpua },
  { label: "PosterNutbag", value: Subject.PosterNutbag },
];

// Contrast per swatch - Yellow/Light are bright enough to need dark text,
// every other option needs light text. Not the same pairing as dol-lib's
// getLabelTextColorClass (that one's for a chip's own caption text sitting
// *next to* a themed background, not text sitting *on* the color itself).
const BACKGROUND_SWATCH_TEXT_CLASS: Record<DolColorHex, string> = {
  [DolColorHex.Blue]: "text-dol-light",
  [DolColorHex.Green]: "text-dol-light",
  [DolColorHex.Red]: "text-dol-light",
  [DolColorHex.Yellow]: "text-dol-dark",
  [DolColorHex.Dark]: "text-dol-light",
  [DolColorHex.Light]: "text-dol-dark",
};

// Selected and active are deliberately different CSS properties (ring vs.
// outline/background) across all three pickers below, so the two can stack
// without visually colliding when a row is both at once (you arrow onto
// the option that's already picked).

const renderBackgroundOption = (
  option: PickerOption<DolColorHex>,
  isSelected: boolean,
  isActive: boolean
): React.ReactNode => (
  <div
    className={twMerge(
      "py-5 px-4 text-xs font-bold tracking-widest uppercase text-center",
      option.value ? BACKGROUND_SWATCH_TEXT_CLASS[option.value] : "text-dol-light",
      isSelected && "ring-2 ring-inset ring-dol-yellow",
      // Arbitrary property, not separate outline/outline-2/outline-white
      // utilities - tailwind-merge (3.0.1) treats bare `outline` and
      // `outline-2` as the same conflict group and silently drops one,
      // which leaves outline-width set with no outline-style (invisible).
      // Confirmed directly: twMerge("outline outline-2 outline-white ...")
      // strips the bare `outline`. This sidesteps that entirely.
      isActive && "[outline:2px_solid_white] -outline-offset-2",
    )}
    style={{ backgroundColor: option.value }}
  >
    {option.label}
  </div>
);

const renderDonutOption = (
  option: PickerOption<DolColorHex>,
  isSelected: boolean,
  isActive: boolean
): React.ReactNode => {
  if (!option.value) {
    return (
      <div
        className={twMerge(
          "h-16 flex items-center justify-center text-gray-medium italic text-sm",
          isActive && "bg-[#222222]",
        )}
      >
        None
      </div>
    );
  }
  return (
    <div
      className={twMerge(
        "flex h-16 mx-auto",
        isActive && "bg-[#222222]",
        isSelected && "ring-2 ring-inset ring-dol-yellow",
      )}
    >
      <div className="w-full shrink-0 flex items-center justify-center">
        <svg width="52" height="52" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="37" fill="transparent" stroke={option.value} strokeWidth="26" />
        </svg>
      </div>
    </div>
  );
};

const renderSubjectOption = (
  option: PickerOption<Subject>,
  isSelected: boolean,
  isActive: boolean
): React.ReactNode => {
  if (!option.value) {
    return (
      <div
        className={twMerge(
          "h-16 flex items-center justify-center text-gray-medium italic text-sm",
          isActive && "bg-[#222222]",
        )}
      >
        None
      </div>
    );
  }
  return (
    <div
      className={twMerge(
        "relative",
        isSelected && "ring-2 ring-inset ring-dol-yellow",
        isActive && "brightness-125",
      )}
    >
      <Image
        src={`/subjects/thumbnails/${option.value}.png`}
        alt={option.label}
        width={460}
        height={168}
        className="w-full h-auto block"
      />
      <span className="absolute bottom-1.5 left-2 text-[11px] font-bold tracking-wide text-white bg-black/40 px-2 py-0.5 rounded">
        {option.label}
      </span>
    </div>
  );
};

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
  // Once minted these are permanent on-chain facts, not a form - a
  // disabled picker still looks like a dropdown that could open, which is
  // actively misleading for a value that never will again. Match the same
  // plain read-only tile every other on-chain attribute already uses
  // (FixedAttributes' DataAttribute) instead of a grayed-out control.
  if (minted) {
    const subjectLabel = getSubjectOptions().find((o) => o.value === subject)?.label;
    return (
      <div className="flex flex-wrap justify-center gap-2 items-center w-full max-w-[640px] mx-auto">
        <DataAttribute
          label="Background"
          data={getDolColorDisplayName(getDolColorFromHexValue(bgColor))}
          attributeColor={"yellow"}
        />
        <DataAttribute
          label="Donut"
          data={donut && getDolColorDisplayName(getDolColorFromHexValue(donut))}
          attributeColor={"yellow"}
        />
        <DataAttribute label="Subject" data={subjectLabel} attributeColor={"yellow"} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row justify-center gap-2 items-center w-full max-w-[640px] mx-auto">
      <AttributePickerShell
        id="background-attribute"
        label="Background"
        currentValue={bgColor}
        options={getDolColorOptions()}
        onChange={handleBgColorChanged}
        attributeColor={"yellow"}
        renderOption={renderBackgroundOption}
      />
      <AttributePickerShell
        id="donut-attribute"
        label="Donut"
        currentValue={donut}
        options={[{ label: "None", value: undefined }, ...getDolColorOptions()]}
        onChange={handleDonutChanged}
        attributeColor={"yellow"}
        renderOption={renderDonutOption}
      />
      <AttributePickerShell
        id="subject-attribute"
        label="Subject"
        currentValue={subject}
        options={[{ label: "None", value: undefined }, ...getSubjectOptions()]}
        onChange={handleSubjectChanged}
        attributeColor={"yellow"}
        renderOption={renderSubjectOption}
      />
      {
        // Each AttributePickerShell is a label sitting above its trigger
        // button, so the outer row's items-center centers this against
        // the *label+button* pair, not the button alone - the icon reads
        // as vertically off from the pickers themselves. Fixed by mirroring
        // that same two-part shape here: an invisible label-height spacer
        // (real label markup/classes, not a guessed number, so it tracks
        // automatically if the label style ever changes) sits above a box
        // matched to the trigger's own rendered height (measured: 30px),
        // with the icon centered inside that box - not the icon itself.
      }
      <div className="flex flex-col items-center mt-2 lg:mt-0 lg:ml-2">
        <span aria-hidden className="invisible block text-[10px] uppercase pb-1">&nbsp;</span>
        <div className="h-[30px] flex items-center">
          <MdAutorenew
            size={40}
            className={twMerge("p-[6px] shadow-md rounded-full cursor-pointer", "animate-color-cycle")}
            title="Randomize"
            role="button"
            aria-label="Randomize"
            onClick={handleRandomizeClick}
            onKeyDown={handleRandomizeKeyDown}
            tabIndex={0}
          />
        </div>
      </div>
    </div>
  );
};
