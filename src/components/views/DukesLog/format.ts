// showDate is already a plain "YYYY-MM-DD" string with zero-padded parts -
// rearranging it directly sidesteps any Date/timezone parsing entirely
// (and the off-by-one-day bug that comes with it for a date-only value).
export const formatShowDate = (showDate: string): string => {
  const [year, month, day] = showDate.split("-");
  return `${month}/${day}/${year}`;
};
