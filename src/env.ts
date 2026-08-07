import "dotenv/config";

export const isWhiteList = (accountId: string | null): boolean => {
  if (!accountId) return false;
  const whiteList = `${process.env.NEXT_PUBLIC_WHITE_LIST}`
    .split(",")
    .map((id) => id.trim());
  return whiteList.includes(accountId);
};
