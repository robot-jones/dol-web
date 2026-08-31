import { PerformanceAttributes } from "@erikmuir/dol-lib/types";
import { fetchStandardJson } from "@/utils";
import type { ServerUpdateResponse } from "@/app/api/mint/[accountId]/[showDate]/[position]/update/route";

export type UpdateBagItemCartApi = {
  startUpdatingItem: (showDate: string, position: number) => void;
  finishUpdatingItem: (showDate: string, position: number, attributes: PerformanceAttributes) => void;
  failUpdatingItem: (showDate: string, position: number, message: string) => void;
};

const errorMessageFor = (reason?: ServerUpdateResponse["reason"]): string => {
  switch (reason) {
    // The claim moved on (released or sold) since this item was last
    // confirmed ready - not something retrying this same click fixes.
    // CartValidator's own periodic re-check is what actually cleans an
    // item like this out of the bag; this is just the message for why the
    // click itself didn't work.
    case "NOT_LOCKED":
      return "This item is no longer reserved for you, so its attributes couldn't be updated.";
    default:
      return "Failed to update this item's attributes. Please try again.";
  }
};

// Pushes a "ready" bag item's current customizable attributes (background/
// donut/subject/inscription) to the already-claimed serial - re-render,
// re-publish, re-submit the on-chain metadata update, same slow chain
// prepare() runs after claiming, minus the claim itself (so the lock timer
// is untouched). Marks the item "updating" immediately, synchronously, for
// the same instant-feedback reason addToBag marks one "pending" - the Bag
// view derives its progress display from that timestamp.
//
// Deliberately not tied to the calling component's own lifecycle - see
// addToBag's own comment on why (cartApi points at CartContextProvider,
// mounted for the whole app session).
export const updateBagItem = async (
  cartApi: UpdateBagItemCartApi,
  accountId: string,
  showDate: string,
  position: number,
  attributes: PerformanceAttributes
): Promise<void> => {
  cartApi.startUpdatingItem(showDate, position);

  let response: ServerUpdateResponse;
  try {
    response = await fetchStandardJson<ServerUpdateResponse>(
      `/api/mint/${accountId}/${showDate}/${position}/update`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attributes),
      }
    );
  } catch (err) {
    console.error("Update bag item request failed:", err);
    cartApi.failUpdatingItem(showDate, position, errorMessageFor(undefined));
    return;
  }

  if (!response.success) {
    cartApi.failUpdatingItem(showDate, position, errorMessageFor(response.reason));
    return;
  }

  cartApi.finishUpdatingItem(showDate, position, attributes);
};
