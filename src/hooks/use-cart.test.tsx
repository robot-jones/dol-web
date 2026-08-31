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

  // Bug fixed 2026-08-28 (CART.md): addPendingItem's own capacity check
  // used to read `items` from the render closure directly, which doesn't
  // reflect calls made earlier in the same synchronous batch (React's
  // functional setItems updater doesn't run until React processes the
  // queued update, not synchronously as each call is made) - so a run of
  // calls landing right at the MAX_CART_ITEMS boundary within one batch
  // could report `true` (added) for more calls than actually got added,
  // even though the underlying state itself stayed correctly capped at 10.
  // All 11 calls here happen in one act() block, deliberately, to
  // reproduce that same-batch condition rather than one add per render.
  it("reports the true per-call result even when a run of adds lands right at the cap in one batch", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    const added: boolean[] = [];
    act(() => {
      for (let position = 1; position <= 11; position++) {
        added.push(result.current.addPendingItem("1998-07-29", position, `Song ${position}`));
      }
    });

    expect(added).toEqual([true, true, true, true, true, true, true, true, true, true, false]);
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

  it("resolvePendingItem stores the attributes it was sent as the item's published snapshot", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
    });
    act(() => {
      result.current.resolvePendingItem("1998-07-29", 1, 7, 1786300000000, { bgColor: "#000000" } as never);
    });

    expect((result.current.items[0] as ReadyCartItem).attributes).toEqual({ bgColor: "#000000" });
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

  // A dropped pending item used to just vanish with no explanation -
  // added 2026-08-28 so a reload mid-add is at least visible via
  // lastError, even though the item itself still isn't recovered (that
  // would need wallet-aware reconciliation, out of scope for this pass -
  // the affected performance page's own lockedBy fallback remains the
  // actual recovery path).
  it("surfaces dropped pending items via lastError, singular", async () => {
    sessionStorage.setItem(
      "dol-cart",
      JSON.stringify([
        { status: "pending", showDate: "1998-07-29", position: 1, song: "Runaway Jim", addedAt: Date.now() },
        readyItem2,
      ])
    );

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([readyItem2]));
    expect(result.current.lastError).toMatch(/^1 item you were adding got interrupted by the reload/);
    expect(result.current.lastError).toMatch(/revisit its performance page/);
  });

  it("surfaces dropped pending items via lastError, pluralized for more than one", async () => {
    sessionStorage.setItem(
      "dol-cart",
      JSON.stringify([
        { status: "pending", showDate: "1998-07-29", position: 1, song: "Runaway Jim", addedAt: Date.now() },
        { status: "pending", showDate: "1998-07-29", position: 2, song: "Wilson", addedAt: Date.now() },
      ])
    );

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(result.current.lastError).toMatch(/^2 items you were adding got interrupted by the reload/);
    expect(result.current.lastError).toMatch(/revisit their performance pages/);
  });

  it("does not set lastError on hydration when nothing was dropped", async () => {
    sessionStorage.setItem("dol-cart", JSON.stringify([readyItem1]));

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([readyItem1]));
    expect(result.current.lastError).toBeNull();
  });

  it("does not clobber sessionStorage with the pre-hydration empty state", async () => {
    sessionStorage.setItem("dol-cart", JSON.stringify([readyItem1]));

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([readyItem1]));

    expect(JSON.parse(sessionStorage.getItem("dol-cart")!)).toEqual([readyItem1]);
  });

  describe("Update Attributes", () => {
    const seedReady = async () => {
      const { result } = renderUseCart();
      await waitFor(() => expect(result.current.items).toEqual([]));
      act(() => {
        result.current.addPendingItem(readyItem1.showDate, readyItem1.position, readyItem1.song);
        result.current.resolvePendingItem(readyItem1.showDate, readyItem1.position, readyItem1.serial, readyItem1.lockedAt, {
          bgColor: "#000000",
        } as never);
      });
      return result;
    };

    it("startUpdatingItem stamps the ready item with an updatingSince timestamp", async () => {
      const result = await seedReady();

      const before = Date.now();
      act(() => {
        result.current.startUpdatingItem(readyItem1.showDate, readyItem1.position);
      });

      const updatingSince = (result.current.items[0] as ReadyCartItem).updatingSince;
      expect(updatingSince).toBeGreaterThanOrEqual(before);
      expect(updatingSince).toBeLessThanOrEqual(Date.now());
    });

    it("startUpdatingItem is a no-op on a pending (not yet ready) item", async () => {
      const { result } = renderUseCart();
      await waitFor(() => expect(result.current.items).toEqual([]));

      act(() => {
        result.current.addPendingItem("1998-07-29", 1, "Runaway Jim");
        result.current.startUpdatingItem("1998-07-29", 1);
      });

      expect((result.current.items[0] as { updatingSince?: number }).updatingSince).toBeUndefined();
    });

    it("finishUpdatingItem sets the new published attributes and clears updatingSince", async () => {
      const result = await seedReady();

      act(() => {
        result.current.startUpdatingItem(readyItem1.showDate, readyItem1.position);
      });
      act(() => {
        result.current.finishUpdatingItem(readyItem1.showDate, readyItem1.position, { bgColor: "#ffffff" } as never);
      });

      const item = result.current.items[0] as ReadyCartItem;
      expect(item.attributes).toEqual({ bgColor: "#ffffff" });
      expect(item.updatingSince).toBeUndefined();
    });

    it("failUpdatingItem clears updatingSince, leaves published attributes untouched, and records lastError", async () => {
      const result = await seedReady();

      act(() => {
        result.current.startUpdatingItem(readyItem1.showDate, readyItem1.position);
      });
      act(() => {
        result.current.failUpdatingItem(readyItem1.showDate, readyItem1.position, "Failed to update this item's attributes. Please try again.");
      });

      const item = result.current.items[0] as ReadyCartItem;
      expect(item.attributes).toEqual({ bgColor: "#000000" });
      expect(item.updatingSince).toBeUndefined();
      expect(result.current.lastError).toBe("Failed to update this item's attributes. Please try again.");
    });

    // A page reload kills the in-flight request's promise chain the same
    // way it does for a still-pending add - the item itself is still a
    // perfectly valid claim (its attributes are whatever was last actually
    // confirmed), so only the stale flag needs stripping, not the item.
    it("drops a stale updatingSince on hydration instead of showing 'still updating' forever", async () => {
      sessionStorage.setItem(
        "dol-cart",
        JSON.stringify([{ ...readyItem1, updatingSince: Date.now() - 60_000 }])
      );

      const { result } = renderUseCart();
      await waitFor(() => expect(result.current.items).toHaveLength(1));

      const item = result.current.items[0] as ReadyCartItem;
      expect(item.updatingSince).toBeUndefined();
      expect(item.serial).toBe(readyItem1.serial);
      expect(result.current.lastError).toBeNull();
    });
  });
});
