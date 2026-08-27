import { useEffect } from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { CartContextProvider, CartItem } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { Bag } from "./Bag";

const item1: CartItem = { showDate: "1998-07-29", position: 1, serial: 7, song: "Runaway Jim", lockedAt: Date.now() };
const item2: CartItem = { showDate: "1998-07-29", position: 2, serial: 8, song: "Wilson" };

const useWalletInterfaceMock = vi.fn();
vi.mock("@/hooks/use-wallet-interface", () => ({
  useWalletInterface: () => useWalletInterfaceMock(),
}));

// PageNote (rendered by Bag itself) also imports from @/utils - mock only
// fetchStandardJson, keep everything else real.
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchStandardJson: vi.fn(),
}));

// Modal portals into #modal-root (see app/layout.tsx) - not present by
// default in jsdom, has to be added before each render. sessionStorage
// also has to be cleared - CartContextProvider's own hydration effect runs
// after (it's the parent of) SeedItems' seeding effect, so leftover state
// from a prior test would otherwise silently clobber the freshly seeded
// items the moment it mounts.
beforeEach(() => {
  sessionStorage.clear();
  useWalletInterfaceMock.mockReset().mockReturnValue({ accountId: "0.0.1", walletInterface: {} });
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

  it("disables Checkout for now, with an explanatory note", () => {
    render(<Seeded items={[item1]} />);
    fireEvent.click(screen.getByRole("button", { name: "AC/DC Bag" }));

    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
    expect(screen.getByText(/Checkout is coming soon/)).toBeInTheDocument();
  });
});
