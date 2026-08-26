import { toFriendlyDate, sanitizeText } from "@erikmuir/dol-lib/utils";

export type ShowHeaderProps = {
  showDate: string;
  venue: string;
  city: string;
  state?: string;
  country: string;
};

export const ShowHeader = ({
  showDate,
  venue,
  city,
  state,
  country,
}: ShowHeaderProps): React.ReactNode => (
  <div className="flex flex-col items-center text-center pb-6">
    <div className="text-2xl">{toFriendlyDate(showDate)}</div>
    <div className="">{sanitizeText(venue)}</div>
    <div className="">{sanitizeText(`${city}, ${state || country}`)}</div>
  </div>
);
