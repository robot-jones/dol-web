import { act, renderHook, waitFor } from "@testing-library/react";
import { CartContextProvider, ReadyCartItem } from "@/cart";
import { useCart } from "./use-cart";

const renderUseCart = () => renderHook(() => useCart(), { wrapper: CartContextProvider });

const readyItem1: ReadyCartItem = {
  status: "ready",
  showDate: "1998-07-29",
  position: 1,
  serial: 7,
  song: "Runaway Jim",
  lockedAt: 1786300000000,
};
const readyItem2: ReadyCartItem = {
  status: "ready",
  showDate: "1998-07-29",
  position: 2,
  serial: 8,
  song: "Wilson",
};

describe("useCart", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("starts empty before sessionStorage hydration, and stays empty with nothing stored", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it("addPendingItem adds a pending entry with an addedAt timestamp, and reports success", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    let added: boolean | undefined;
    const before = Date.now();
    act(() => {
      added = result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
    });

    expect(added).toBe(true);
    expect(result.current.items).toEqual([
      { status: "pending", showDate: "1998-07-29", position: 1, song: "Runaway Jim", addedAt: expect.any(Number) },
    ]);
    expect((result.current.items[0] as { addedAt: number }).addedAt).toBeGreaterThanOrEqual(before);
  });

  it("refuses to add the same performance twice, regardless of status", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
    });
    let added: boolean | undefined;
    act(() => {
      added = result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(1);
  });

  // Hedera's own per-transfer NFT limit, mirrored from the checkout
  // endpoint's own MAX_CHECKOUT_ITEMS - CART.md.
  it("refuses to add an 11th item", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      for (let position = 1; position <= 10; position++) {
        result.current.addPendingItem("1998-07-29", position, `Song ${position}`);
      }
    });
    expect(result.current.items).toHaveLength(10);

    let added: boolean | undefined;
    act(() => {
      added = result.current.addPendingItem("1998-07-29", 11, "Song 11");
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(10);
  });

  it("resolvePendingItem replaces a pending entry with its ready form", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
    });
    act(() => {
      result.current.resolvePendingItem("1998-07-29", 1, 7, 1786300000000);
    });

    expect(result.current.items).toEqual([
      { status: "ready", showDate: "1998-07-29", position: 1, song: "Runaway Jim", serial: 7, lockedAt: 1786300000000 },
    ]);
  });

  it("resolvePendingItem is a no-op if the item isn't there any more", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.resolvePendingItem("1998-07-29", 1, 7);
    });

    expect(result.current.items).toEqual([]);
  });

  it("failPendingItem drops the pending entry and records lastError", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
    });
    act(() => {
      result.current.failPendingItem("1998-07-29", 1, "There's no token supply at this time.");
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.lastError).toBe("There's no token supply at this time.");
  });

  it("clearLastError clears it", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
      result.current.failPendingItem("1998-07-29", 1, "Failed to claim performance.");
    });
    act(() => {
      result.current.clearLastError();
    });

    expect(result.current.lastError).toBeNull();
  });

  it("removes an item by showDate/position", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem(readyItem1.showDate, readyItem1.position, readyItem1.song);
      result.current.resolvePendingItem(readyItem1.showDate, readyItem1.position, readyItem1.serial, readyItem1.lockedAt);
      result.current.addPendingItem(readyItem2.showDate, readyItem2.position, readyItem2.song);
      result.current.resolvePendingItem(readyItem2.showDate, readyItem2.position, readyItem2.serial);
    });
    act(() => {
      result.current.removeItem(readyItem1.showDate, readyItem1.position);
    });

    expect(result.current.items).toEqual([readyItem2]);
  });

  it("clears the whole bag", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem(readyItem1.showDate, readyItem1.position, readyItem1.song);
      result.current.addPendingItem(readyItem2.showDate, readyItem2.position, readyItem2.song);
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
  });

  it("persists ready items to sessionStorage and rehydrates a fresh provider instance from it", async () => {
    const { result, unmount } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem(readyItem1.showDate, readyItem1.position, readyItem1.song);
      result.current.resolvePendingItem(readyItem1.showDate, readyItem1.position, readyItem1.serial, readyItem1.lockedAt);
    });
    await waitFor(() => expect(sessionStorage.getItem("dol-cart")).not.toBeNull());
    unmount();

    const { result: result2 } = renderUseCart();
    await waitFor(() => expect(result2.current.items).toEqual([readyItem1]));
  });

  // A "pending" entry means a prepare() call was in flight when the tab
  // closed or reloaded - that promise chain is gone with the old page, so
  // it's dropped on hydration rather than resurrected with no way to ever
  // resolve it (CART.md).
  it("drops a stored pending item on hydration instead of resurrecting it", async () => {
    sessionStorage.setItem(
      "dol-cart",
      JSON.stringify([
        { status: "pending", showDate: "1998-07-29", position: 1, song: "Runaway Jim", addedAt: Date.now() },
        readyItem2,
      ])
    );

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([readyItem2]));
  });

  it("does not clobber sessionStorage with the pre-hydration empty state", async () => {
    sessionStorage.setItem("dol-cart", JSON.stringify([readyItem1]));

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([readyItem1]));

    expect(JSON.parse(sessionStorage.getItem("dol-cart")!)).toEqual([readyItem1]);
  });
});
