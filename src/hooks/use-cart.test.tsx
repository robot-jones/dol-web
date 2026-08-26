import { act, renderHook, waitFor } from "@testing-library/react";
import { CartContextProvider } from "@/cart";
import { useCart } from "./use-cart";

const renderUseCart = () => renderHook(() => useCart(), { wrapper: CartContextProvider });

const item1 = { showDate: "1998-07-29", position: 1, serial: 7, song: "Runaway Jim", lockedAt: 1786300000000 };
const item2 = { showDate: "1998-07-29", position: 2, serial: 8, song: "Wilson" };

describe("useCart", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("starts empty before sessionStorage hydration, and stays empty with nothing stored", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it("adds an item and reports success", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    let added: boolean | undefined;
    act(() => {
      added = result.current.addItem(item1);
    });

    expect(added).toBe(true);
    expect(result.current.items).toEqual([item1]);
  });

  it("refuses to add the same performance twice", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addItem(item1);
    });
    let added: boolean | undefined;
    act(() => {
      added = result.current.addItem(item1);
    });

    expect(added).toBe(false);
    expect(result.current.items).toEqual([item1]);
  });

  // Hedera's own per-transfer NFT limit, mirrored from the checkout
  // endpoint's own MAX_CHECKOUT_ITEMS - CART.md checklist item 6.
  it("refuses to add an 11th item", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      for (let position = 1; position <= 10; position++) {
        result.current.addItem({ showDate: "1998-07-29", position, serial: position, song: `Song ${position}` });
      }
    });
    expect(result.current.items).toHaveLength(10);

    let added: boolean | undefined;
    act(() => {
      added = result.current.addItem({ showDate: "1998-07-29", position: 11, serial: 11, song: "Song 11" });
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(10);
  });

  it("removes an item by showDate/position", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
    });
    act(() => {
      result.current.removeItem(item1.showDate, item1.position);
    });

    expect(result.current.items).toEqual([item2]);
  });

  it("clears the whole bag", async () => {
    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
  });

  it("persists to sessionStorage and rehydrates a fresh provider instance from it", async () => {
    const { result, unmount } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.addItem(item1);
    });
    await waitFor(() => expect(sessionStorage.getItem("dol-cart")).not.toBeNull());
    unmount();

    const { result: result2 } = renderUseCart();
    await waitFor(() => expect(result2.current.items).toEqual([item1]));
  });

  it("does not clobber sessionStorage with the pre-hydration empty state", async () => {
    sessionStorage.setItem("dol-cart", JSON.stringify([item1]));

    const { result } = renderUseCart();
    await waitFor(() => expect(result.current.items).toEqual([item1]));

    expect(JSON.parse(sessionStorage.getItem("dol-cart")!)).toEqual([item1]);
  });
});
