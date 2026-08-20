import { getOrdinalWithSuffix } from "@erikmuir/dol-lib/utils";

export type PerformanceHeadingProps = {
  song?: string;
  date?: string;
  // Already run through getSetText (e.g. "Set 2", "Encore 1"), not the raw
  // Setlist.set key.
  set?: string;
  // 1-based position within `set`, not Setlist.position's show-overall
  // number - that stays exactly what it is, unrelated, in Fixed NFT
  // Attributes' own POSITION tile below. Worded as "3rd song," never
  // "Position," so this can't be read as a second value for that field.
  positionInSet?: number;
};

export const PerformanceHeading = ({
  song,
  date,
  set,
  positionInSet,
}: PerformanceHeadingProps): React.ReactNode => {
  const setDescription = set && positionInSet
    ? `${set}, ${getOrdinalWithSuffix(positionInSet)} song`
    : set;
  const subline = [date, setDescription].filter(Boolean).join(" · ");

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">{song || "Loading…"}</h1>
      {subline && <div className="text-sm text-gray-medium">{subline}</div>}
    </div>
  );
};
