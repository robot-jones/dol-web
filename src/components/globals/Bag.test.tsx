import { useEffect } from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { CartContextProvider, CartItem } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { Bag } from "./Bag";

const item1: CartItem = { showDate: "1998-07-29", position: 1, serial: 7, song: "Runaway Jim", lockedAt: Date.now() };
const item2: CartItem = { showDate: "1998-07-29", position: 2, serial: 8, song: "Wilson" };

const purchaseNfts = vi.fn();
const useWalletInterfaceMock = vi.fn();
vi.mock("@/hooks/use-wallet-interface", () => ({
  useWalletInterface: () => useWalletInterfaceMock(),
}));

const mutateAccountStatus = vi.fn();
vi.mock("@/hooks/use-account-status", () => ({
  useAccountStatus: () => ({ mutateAccountStatus }),
}));

// PageNote (rendered by Bag itself) also imports from @/utils - mock only
// fetchStandardJson, keep everything else real.
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchStandardJson: vi.fn(),
}));

// TransferTransaction.fromBytes just needs to hand something back for
// purchaseNfts to receive - purchaseNfts itself is mocked, so the value's
// shape doesn't matter beyond being a stable, assertable placeholder.
vi.mock("@hashgraph/sdk", () => ({
  NftId: class {
    constructor(public tokenId: unknown, public serial: number) {}
  },
  TokenId: { fromString: (s: string) => ({ toString: () => s }) },
  TransferTransaction: { fromBytes: () => "MOCK_TX" },
}));

const rawTxBytes = { type: "Buffer" as const, data: [1, 2, 3] };

// Modal portals into #modal-root (see app/layout.tsx) - not present by
// default in jsdom, has to be added before each render. sessionStorage
// also has to be cleared - CartContextProvider's own hydration effect runs
// after (it's the parent of) SeedItems' seeding effect, so leftover state
// from a prior test would otherwise silently clobber the freshly seeded
// items the moment it mounts.
beforeEach(() => {
  sessionStorage.clear();
  purchaseNfts.mockReset();
  mutateAccountStatus.mockReset();
  useWalletInterfaceMock.mockReset().mockReturnValue({
    accountId: "0.0.1",
    walletInterface: { purchaseNfts },
  });
  vi.mocked(fetchStandardJson).mockReset().mockResolvedValue(undefined);
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
});

afterEach(() => {
  document.getElementById("modal-root")?.remove();
});

// Seeds cart state via the same public API the real "Add to Bag" button
// will use, rather than reaching into CartContext internals. items/addItem
// deliberately left out of the effect's deps - this only ever needs to run
// once, on mount, with whatever was passed in at that point.
const SeedItems = ({ items }: { items: CartItem[] }) => {
  const { addItem } = useCart();
  useEffect(() => {
    items.forEach((item) => addItem(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const Seeded = ({ items }: { items: CartItem[] }) => (
  <CartContextProvider>
    <SeedItems items={items} />
    <Bag />
  </CartContextProvider>
);

describe("Bag", () => {
  it("shows no badge when the bag is empty", () => {
    render(
      <CartContextProvider>
        <Bag />
      </CartContextProvider>
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows an item-count badge once items are added", () => {
    render(<Seeded items={[item1, item2]} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("says the bag is empty when opened with nothing in it", () => {
    render(
      <CartContextProvider>
        <Bag />
      </CartContextProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
    expect(screen.getByText("Your bag is empty.")).toBeInTheDocument();
  });

  it("lists each item's song and date when opened", () => {
    render(<Seeded items={[item1, item2]} />);
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

    expect(screen.getByText("Runaway Jim")).toBeInTheDocument();
    expect(screen.getByText("Wilson")).toBeInTheDocument();
  });

  it("removes an item via its Remove button", () => {
    render(<Seeded items={[item1, item2]} />);
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

    const runawayJimRow = screen.getByText("Runaway Jim").closest("li")!;
    fireEvent.click(within(runawayJimRow).getByRole("button", { name: "Remove" }));

    expect(screen.queryByText("Runaway Jim")).not.toBeInTheDocument();
    expect(screen.getByText("Wilson")).toBeInTheDocument();
    // Badge count drops with it.
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // Regression: useCart().removeItem only ever touched local state - Remove
  // silently left the performance locked server-side until the 15-minute
  // sweep caught it, which becomes a real problem once Remove is the only
  // way to cancel a claim (hard cutover away from the single-item flow).
  it("releases the server-side claim when an item is removed", async () => {
    render(<Seeded items={[item1]} />);
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(fetchStandardJson).toHaveBeenCalledWith(
        "/api/mint/0.0.1/1998-07-29/1/7/abort",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "USER_CANCELLED" }),
        }
      )
    );
  });

  it("still removes the item locally even if releasing the claim fails", async () => {
    vi.mocked(fetchStandardJson).mockRejectedValue(new Error("network error"));
    render(<Seeded items={[item1]} />);
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByText("Runaway Jim")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchStandardJson).toHaveBeenCalled());
  });

  it("skips the release call (but still removes locally) with no wallet connected", () => {
    useWalletInterfaceMock.mockReturnValue({ accountId: null, walletInterface: null });
    render(<Seeded items={[item1]} />);
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByText("Runaway Jim")).not.toBeInTheDocument();
    expect(fetchStandardJson).not.toHaveBeenCalled();
  });

  describe("Checkout", () => {
    const clickCheckout = () => {
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
      fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    };

    it("signs and finalizes every confirmed item, then clears the bag", async () => {
      vi.mocked(fetchStandardJson).mockImplementation(async (url: unknown) => {
        if (`${url}`.endsWith("/checkout")) {
          return {
            txBytes: rawTxBytes,
            confirmed: [
              { showDate: item1.showDate, position: item1.position },
              { showDate: item2.showDate, position: item2.position },
            ],
            expired: [],
          };
        }
        return true; // finalize calls
      });
      purchaseNfts.mockResolvedValue(true);

      render(<Seeded items={[item1, item2]} />);
      clickCheckout();

      await waitFor(() => expect(screen.getByText("Your bag is empty.")).toBeInTheDocument());

      expect(purchaseNfts).toHaveBeenCalledTimes(1);
      const [tx, purchaseItems] = purchaseNfts.mock.calls[0];
      expect(tx).toBe("MOCK_TX");
      expect(purchaseItems).toEqual([
        expect.objectContaining({ showDate: item1.showDate, position: item1.position, nftId: expect.objectContaining({ serial: item1.serial }) }),
        expect.objectContaining({ showDate: item2.showDate, position: item2.position, nftId: expect.objectContaining({ serial: item2.serial }) }),
      ]);
      expect(fetchStandardJson).toHaveBeenCalledWith(
        `/api/mint/0.0.1/${item1.showDate}/${item1.position}/${item1.serial}`,
        { method: "POST" }
      );
      expect(fetchStandardJson).toHaveBeenCalledWith(
        `/api/mint/0.0.1/${item2.showDate}/${item2.position}/${item2.serial}`,
        { method: "POST" }
      );
      // Regression (CART.md "known gap"): Performance.tsx's old single-item
      // flow used to revalidate account status right after finalize, so a
      // still-presale second attempt in the same tab would see updated
      // whitelist status. Finalize moved here on the hard cutover - this
      // is what keeps that same revalidation happening.
      expect(mutateAccountStatus).toHaveBeenCalledTimes(1);
    });

    it("does not revalidate account status when nothing actually got purchased", async () => {
      vi.mocked(fetchStandardJson).mockResolvedValue({
        txBytes: rawTxBytes,
        confirmed: [{ showDate: item1.showDate, position: item1.position }],
        expired: [],
      });
      purchaseNfts.mockResolvedValue(false);

      render(<Seeded items={[item1]} />);
      clickCheckout();

      await screen.findByText(/didn't confirm the transaction/);
      expect(mutateAccountStatus).not.toHaveBeenCalled();
    });

    // Erik's call (CART.md): a declined/failed signature leaves the bag
    // alone rather than releasing every item - nothing was paid for, and
    // re-preparing everything from scratch is a harsh retry cost.
    it("leaves items in the bag and shows a notice when the wallet doesn't confirm", async () => {
      vi.mocked(fetchStandardJson).mockResolvedValue({
        txBytes: rawTxBytes,
        confirmed: [{ showDate: item1.showDate, position: item1.position }],
        expired: [],
      });
      purchaseNfts.mockResolvedValue(false);

      render(<Seeded items={[item1]} />);
      clickCheckout();

      expect(await screen.findByText(/didn't confirm the transaction/)).toBeInTheDocument();
      expect(screen.getByText("Runaway Jim")).toBeInTheDocument();
    });

    it("drops expired items with a notice, but still finalizes the confirmed ones", async () => {
      vi.mocked(fetchStandardJson).mockImplementation(async (url: unknown) => {
        if (`${url}`.endsWith("/checkout")) {
          return {
            txBytes: rawTxBytes,
            confirmed: [{ showDate: item1.showDate, position: item1.position }],
            expired: [{ showDate: item2.showDate, position: item2.position }],
          };
        }
        return true;
      });
      purchaseNfts.mockResolvedValue(true);

      render(<Seeded items={[item1, item2]} />);
      clickCheckout();

      expect(await screen.findByText(/expired and were removed.*Wilson/)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText("Your bag is empty.")).toBeInTheDocument());
    });

    it("shows a notice and makes no request with no wallet connected", () => {
      useWalletInterfaceMock.mockReturnValue({ accountId: null, walletInterface: null });
      render(<Seeded items={[item1]} />);
      clickCheckout();

      expect(screen.getByText("Connect your wallet to check out.")).toBeInTheDocument();
      expect(fetchStandardJson).not.toHaveBeenCalled();
    });

    it("shows an error notice if the checkout request itself fails", async () => {
      vi.mocked(fetchStandardJson).mockRejectedValue(new Error("network error"));

      render(<Seeded items={[item1]} />);
      clickCheckout();

      expect(await screen.findByText(/Something went wrong starting checkout/)).toBeInTheDocument();
      expect(screen.getByText("Runaway Jim")).toBeInTheDocument();
    });
  });
});
