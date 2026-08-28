import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { CartContextProvider, CartItem } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { CartValidator } from "./CartValidator";

const useWalletInterfaceMock = vi.fn();
vi.mock("@/hooks/use-wallet-interface", () => ({
  useWalletInterface: () => useWalletInterfaceMock(),
}));

vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchStandardJson: vi.fn(),
}));

const readyItem: CartItem = {
  status: "ready",
  showDate: "1998-07-29",
  position: 1,
  serial: 7,
  song: "Runaway Jim",
  lockedAt: Date.now(),
};

// Seeds cart state via the same public API the real Add to Bag flow uses
// (see Bag.test.tsx), not by reaching into context internals.
const SeedItems = ({ items }: { items: CartItem[] }) => {
  const cart = useCart();
  useEffect(() => {
    items.forEach((item) => {
      cart.addPendingItem(item.showDate, item.position, item.song);
      if (item.status === "ready") {
        cart.resolvePendingItem(item.showDate, item.position, item.serial, item.lockedAt);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// Renders cart.lastError as visible text, and each remaining item's song -
// enough to assert on without reaching into context internals.
const CartObserver = () => {
  const cart = useCart();
  return (
    <div>
      <div data-testid="last-error">{cart.lastError}</div>
      <div data-testid="items">{cart.items.map((i) => i.song).join(",")}</div>
    </div>
  );
};

const renderValidator = (items: CartItem[]) =>
  render(
    <CartContextProvider>
      <SeedItems items={items} />
      <CartValidator />
      <CartObserver />
    </CartContextProvider>
  );

beforeEach(() => {
  sessionStorage.clear();
  useWalletInterfaceMock.mockReset().mockReturnValue({ accountId: "0.0.1", walletInterface: {} });
  vi.mocked(fetchStandardJson).mockReset();
});

describe("CartValidator", () => {
  it("does nothing with no wallet connected", async () => {
    useWalletInterfaceMock.mockReturnValue({ accountId: null, walletInterface: null });
    const { getByTestId } = renderValidator([readyItem]);

    await waitFor(() => expect(getByTestId("items")).toHaveTextContent("Runaway Jim"));
    expect(fetchStandardJson).not.toHaveBeenCalled();
  });

  it("leaves a ready item alone when it's still genuinely locked by this account", async () => {
    vi.mocked(fetchStandardJson).mockResolvedValue({ lockedBy: "0.0.1" });
    const { getByTestId } = renderValidator([readyItem]);

    await waitFor(() =>
      expect(fetchStandardJson).toHaveBeenCalledWith("/api/performances/1998-07-29/1")
    );
    expect(getByTestId("items")).toHaveTextContent("Runaway Jim");
    expect(getByTestId("last-error")).toHaveTextContent("");
  });

  // Regression this whole component exists to fix (CART.md): reconcile-
  // claims-sweep releases an abandoned claim server-side after ~15m, but a
  // still-open tab's local cart never found out - it kept showing "In Your
  // Bag" for something that's actually free again, indefinitely.
  it("removes a ready item and reports why once it's no longer locked by this account", async () => {
    vi.mocked(fetchStandardJson).mockResolvedValue({ lockedBy: undefined });
    const { getByTestId } = renderValidator([readyItem]);

    await waitFor(() => expect(getByTestId("items")).toHaveTextContent(""));
    expect(getByTestId("last-error")).toHaveTextContent(
      "Runaway Jim was removed from your bag - it's no longer reserved for you."
    );
  });

  it("also removes it if someone else claimed it in the meantime", async () => {
    vi.mocked(fetchStandardJson).mockResolvedValue({ lockedBy: "0.0.999" });
    const { getByTestId } = renderValidator([readyItem]);

    await waitFor(() => expect(getByTestId("items")).toHaveTextContent(""));
  });

  it("does not check a still-pending item", async () => {
    const pending: CartItem = { status: "pending", showDate: "1998-07-29", position: 1, song: "Runaway Jim", addedAt: Date.now() };
    renderValidator([pending]);

    await new Promise((r) => setTimeout(r, 50));
    expect(fetchStandardJson).not.toHaveBeenCalled();
  });

  it("does not remove the item if the check itself fails", async () => {
    vi.mocked(fetchStandardJson).mockRejectedValue(new Error("network error"));
    const { getByTestId } = renderValidator([readyItem]);

    await waitFor(() => expect(fetchStandardJson).toHaveBeenCalled());
    expect(getByTestId("items")).toHaveTextContent("Runaway Jim");
  });

  it("checks again on the next interval tick", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(fetchStandardJson).mockResolvedValue({ lockedBy: "0.0.1" });
      renderValidator([readyItem]);

      await vi.waitFor(() => expect(fetchStandardJson).toHaveBeenCalledTimes(1));

      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(fetchStandardJson).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
