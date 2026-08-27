import { MintStatusDisplayText, PerformanceAttributes, SerialErrorResponse } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";
import type { ServerPrepareResponse } from "@/app/api/mint/[accountId]/[showDate]/[position]/prepare/route";

export type AddToBagCartApi = {
  addPendingItem: (showDate: string, position: number, song: string) => boolean;
  resolvePendingItem: (showDate: string, position: number, serial: number, lockedAt?: number) => void;
  failPendingItem: (showDate: string, position: number, message: string) => void;
};

// Same mapping the old single-item flow used (MintStatusDisplayText), so
// a given failure reason still reads the same way - just surfaced via the
// bag's lastError now instead of directly on the performance page.
const errorMessageFor = (serial: number | SerialErrorResponse): string => {
  switch (serial) {
    case SerialErrorResponse.LOCK_NOT_ACQUIRED:
      return MintStatusDisplayText.LockNotAcquired;
    case SerialErrorResponse.ALREADY_MINTED:
      return MintStatusDisplayText.AlreadyMinted;
    case SerialErrorResponse.NO_SUPPLY:
      return MintStatusDisplayText.NoSupply;
    case SerialErrorResponse.TOO_MANY_LOCKED:
      return MintStatusDisplayText.TooManyLocked;
    case SerialErrorResponse.METADATA_PUBLISH_FAILED:
      return MintStatusDisplayText.MetadataPublishFailed;
    default:
      return MintStatusDisplayText.LockNotAcquired;
  }
};

// Adds a performance to the bag: a pending placeholder appears
// immediately - synchronously, before any network call - so the
// performance page can show instant feedback, then prepare() runs in the
// background and resolves/removes the pending item once it's done.
//
// Deliberately not tied to the calling component's own lifecycle:
// cartApi's functions point at CartContextProvider, which is mounted for
// the whole app session, so this keeps running correctly even if the user
// navigates to a different performance mid-flight - which also happens to
// fix the old flow's gap where its in-flight status could bleed into
// whatever page you navigated to next, since that status lived on
// Performance.tsx itself rather than surviving navigation (CART.md).
export const addToBag = async (
  cartApi: AddToBagCartApi,
  accountId: string,
  showDate: string,
  position: number,
  attributes: PerformanceAttributes
): Promise<void> => {
  // Caller (Performance.tsx) already checks capacity/duplicate before
  // calling this - this check is just defensive, not the real gate.
  const added = cartApi.addPendingItem(showDate, position, attributes.song ?? "");
  if (!added) return;

  // Unhandled throw here used to leave the button disabled forever
  // (Finding 31) - fetchStandardJson throws on any unmodeled error.
  let response: ServerPrepareResponse;
  try {
    response = await fetchStandardJson<ServerPrepareResponse>(
      `/api/mint/${accountId}/${showDate}/${position}/prepare`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attributes),
      }
    );
  } catch (err) {
    console.error("Add to Bag request failed:", err);
    cartApi.failPendingItem(showDate, position, MintStatusDisplayText.LockNotAcquired);
    // Can't tell if a claim landed before the failure - release
    // defensively (serial in the URL is unused by the abort route when
    // there's nothing to release).
    try {
      await fetchStandardJson(
        `/api/mint/${accountId}/${showDate}/${position}/0/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "SYSTEM_FAILURE" }),
        }
      );
    } catch (abortErr) {
      console.error("Cleanup abort request failed:", abortErr);
    }
    return;
  }

  const { serial, lockedAt } = response;

  if (typeof serial !== "number" || serial <= 0) {
    cartApi.failPendingItem(showDate, position, errorMessageFor(serial));
    try {
      await fetchStandardJson(
        `/api/mint/${accountId}/${showDate}/${position}/${serial}/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "SYSTEM_FAILURE" }),
        }
      );
    } catch (err) {
      console.error("Cleanup abort request failed:", err);
    }
    return;
  }

  cartApi.resolvePendingItem(showDate, position, serial, lockedAt);
};
