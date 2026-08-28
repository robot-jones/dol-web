import { useEffect } from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { CartContextProvider, CartItem } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { Bag } from "./Bag";

const item1: CartItem = {
  status: "ready",
  showDate: "1998-07-29",
  position: 1,
  serial: 7,
  song: "Runaway Jim",
  lockedAt: Date.now(),
};
const item2: CartItem = { status: "ready", showDate: "1998-07-29", position: 2, serial: 8, song: "Wilson" };

const purchaseNfts = vi.fn();
const useWalletInterfaceMock = vi.fn();
vi.mock("@/hooks/use-wallet-interface", () => ({
  useWalletInterface: () => useWalletInterfaceMock(),
}));

const mutateAccountStatus = vi.fn();
vi.mock("@/hooks/use-account-status", () => ({
  useAccountStatus: () => ({ mutateAccountStatus }),
}));

// Overrides vitest.setup.ts's global next/navigation mock, which hands
// back a brand new push: vi.fn() on every render - fine for components
// that just call it, but useless for asserting what it was called with.
// A stable reference here is what makes that assertable.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
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
  push.mockReset();
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
// will use (addPendingItem, then resolvePendingItem for anything meant to
// be "ready"), rather than reaching into CartContext internals. Deps
// deliberately left out of the effect - this only ever needs to run once,
// on mount, with whatever was passed in at that point.
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

  // Regression: reported live as "Locked for -1:-16 · auto-releases...".
  // `now` only gets refreshed once the ticking effect (re)starts, gated
  // on `open` - if an item's real lockedAt is later than whatever `now`
  // was left at while the bag was closed (e.g. it was added minutes after
  // the bag last rendered), the very first render after opening used the
  // stale `now`, and now - lockedAt came out negative. Fixed by setting
  // now immediately when the effect starts instead of waiting for the
  // first 1s tick.
  it("does not show a negative elapsed time for an item locked after the bag last rendered", () => {
    vi.useFakeTimers();
    try {
      const mountTime = Date.now();
      const lockedAfterMount = mountTime + 65_000;
      render(<Seeded items={[{ ...item1, lockedAt: lockedAfterMount }]} />);

      vi.setSystemTime(lockedAfterMount + 5_000);
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

      expect(screen.queryByText(/Locked for -/)).not.toBeInTheDocument();
      expect(screen.getByText("Locked for 00:05")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes a ready item via its Remove button", () => {
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
  it("releases the server-side claim when a ready item is removed", async () => {
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

  describe("pending items", () => {
    const PendingOnly = () => {
      const cart = useCart();
      useEffect(() => {
        cart.addPendingItem("1998-07-29", 1, "Runaway Jim");
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };
    const renderWithPending = () =>
      render(
        <CartContextProvider>
          <PendingOnly />
          <Bag />
        </CartContextProvider>
      );

    it("shows progress text instead of a Locked-for note, and no Remove button", () => {
      renderWithPending();
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

      expect(screen.getByText("Runaway Jim")).toBeInTheDocument();
      // getProgressStepIndex(addedAt, now) is 0 immediately after adding -
      // CLAIM_PROGRESS_STEPS[0] is MintStatusDisplayText.Claiming.
      expect(screen.getByText("Claiming performance...")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    });

    it("counts toward the badge like any other item", () => {
      renderWithPending();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("disables Checkout with a waiting label while anything is still pending", () => {
      renderWithPending();
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

      const checkoutButton = screen.getByRole("button", { name: "Waiting for items…" });
      expect(checkoutButton).toBeDisabled();
    });

    it("re-enables Checkout once the pending item resolves", () => {
      const ResolvesItself = () => {
        const cart = useCart();
        useEffect(() => {
          cart.addPendingItem("1998-07-29", 1, "Runaway Jim");
          cart.resolvePendingItem("1998-07-29", 1, 7, Date.now());
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        return null;
      };
      render(
        <CartContextProvider>
          <ResolvesItself />
          <Bag />
        </CartContextProvider>
      );
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

      expect(screen.getByRole("button", { name: "Checkout" })).not.toBeDisabled();
    });
  });

  describe("lastError", () => {
    const FailsItself = () => {
      const cart = useCart();
      useEffect(() => {
        cart.addPendingItem("1998-07-29", 1, "Runaway Jim");
        cart.failPendingItem("1998-07-29", 1, "There's no token supply at this time.");
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };

    it("shows the most recent add-to-bag failure when the bag is opened", () => {
      render(
        <CartContextProvider>
          <FailsItself />
          <Bag />
        </CartContextProvider>
      );
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

      expect(screen.getByText("There's no token supply at this time.")).toBeInTheDocument();
      // The failed item never made it to ready, so it's gone from the list -
      // "empty" and the error note can both be true at once.
      expect(screen.getByText("Your bag is empty.")).toBeInTheDocument();
    });

    it("clears once the bag is closed", () => {
      render(
        <CartContextProvider>
          <FailsItself />
          <Bag />
        </CartContextProvider>
      );
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
      expect(screen.getByText("There's no token supply at this time.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

      expect(screen.queryByText("There's no token supply at this time.")).not.toBeInTheDocument();
    });
  });

  describe("Checkout", () => {
    // Goes all the way through the relocated "Confirm Mint" modal - most
    // of these tests are about what happens once checkout actually starts,
    // not about the confirm gate itself (that's covered separately below).
    const clickCheckout = () => {
      fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
      fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
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
      // Erik's idea (CART.md): once something actually finalized, send the
      // buyer straight to their Stash to see what they just got.
      expect(push).toHaveBeenCalledWith("/stash");
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
      // Nothing was purchased - items are still in the bag for a retry,
      // so navigating away would be actively unhelpful here.
      expect(push).not.toHaveBeenCalled();
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
      // Runaway Jim still finalized despite Wilson expiring - still worth
      // sending them to see it.
      expect(push).toHaveBeenCalledWith("/stash");
    });

    it("shows a notice and makes no request with no wallet connected", () => {
      useWalletInterfaceMock.mockReturnValue({ accountId: null, walletInterface: null });
      render(<Seeded items={[item1]} />);
      clickCheckout();

      expect(screen.getByText("Connect your wallet to check out.")).toBeInTheDocument();
      expect(fetchStandardJson).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });

    it("shows an error notice if the checkout request itself fails", async () => {
      vi.mocked(fetchStandardJson).mockRejectedValue(new Error("network error"));

      render(<Seeded items={[item1]} />);
      clickCheckout();

      expect(await screen.findByText(/Something went wrong starting checkout/)).toBeInTheDocument();
      expect(screen.getByText("Runaway Jim")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    describe("Confirm Mint gate", () => {
      it("shows the item count and total price, pluralized for multiple items", () => {
        render(<Seeded items={[item1, item2]} />);
        fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
        fireEvent.click(screen.getByRole("button", { name: "Checkout" }));

        expect(screen.getByText(/2 performances/)).toBeInTheDocument();
        expect(screen.getByText(/92 ℏ/)).toBeInTheDocument();
      });

      it("keeps it singular for one item", () => {
        render(<Seeded items={[item1]} />);
        fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
        fireEvent.click(screen.getByRole("button", { name: "Checkout" }));

        expect(screen.getByText(/1 performance\b/)).toBeInTheDocument();
      });

      it("does not start checkout when Cancel is clicked", () => {
        render(<Seeded items={[item1]} />);
        fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));
        fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(fetchStandardJson).not.toHaveBeenCalled();
        // Bag itself is untouched - still there to try again.
        expect(screen.getByText("Runaway Jim")).toBeInTheDocument();
      });
    });
  });
});
