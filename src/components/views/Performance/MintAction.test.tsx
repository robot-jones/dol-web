import { useEffect } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CollectionMintStatus } from "@erikmuir/dol-lib/types";
import { CartContextProvider, addToBag } from "@/cart";
import { useCart } from "@/hooks/use-cart";
import { fetchStandardJson } from "@/utils";
import { openWalletConnectModal } from "@/wallet";
import { MintAction, MintActionProps } from "./MintAction";

const associateToken = vi.fn();
const useIsTokenAssociatedMock = vi.fn();
vi.mock("@/hooks/use-mirror", () => ({
  useIsTokenAssociated: () => useIsTokenAssociatedMock(),
}));

// MintAction imports openWalletConnectModal from the @/wallet barrel, which
// pulls in the real DAppConnector singleton (client.ts) - that crashes
// jsdom with "window.matchMedia is not a function" if not mocked out.
vi.mock("@/wallet", () => ({
  openWalletConnectModal: vi.fn(),
}));

// addToBag itself is covered by its own concerns elsewhere - here it's
// mocked out so these tests are only about what MintAction decides to
// call it with, not what it does once called. CartContextProvider stays
// real so bag-membership branches (pending/ready/full) can be driven
// through the same public API Bag.test.tsx uses.
vi.mock("@/cart", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/cart")>()),
  addToBag: vi.fn(),
}));

vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchStandardJson: vi.fn(),
}));

const baseProps: MintActionProps = {
  showDate: "1998-07-29",
  position: 1,
  performanceLoading: false,
  serial: undefined,
  lockedBy: undefined,
  lockedAt: undefined,
  mutatePerformance: vi.fn(),
  attributes: { song: "Wilson" },
  pageLoaded: true,
  hasSetlist: true,
  accountId: "0.0.1",
  walletInterface: { associateToken } as unknown as MintActionProps["walletInterface"],
  accountStatusLoading: false,
  isBlocked: false,
  isWhitelisted: false,
  appConfigStatusLoading: false,
  collectionMintStatus: CollectionMintStatus.OPEN,
};

// Seeds cart state via the same public API the real "Add to Bag" button
// uses (see Bag.test.tsx) - not addToBag itself, since that's mocked out
// above.
const SeedItems = ({
  items,
}: {
  items: { showDate: string; position: number; song: string; serial?: number; lockedAt?: number }[];
}) => {
  const cart = useCart();
  useEffect(() => {
    items.forEach((item) => {
      cart.addPendingItem(item.showDate, item.position, item.song);
      if (item.serial) {
        cart.resolvePendingItem(item.showDate, item.position, item.serial, item.lockedAt);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// Observes cart.bagOpenRequestCount via the same public API Bag.tsx itself
// reads it through - not reaching into context internals.
const BagOpenRequestCounter = () => {
  const cart = useCart();
  return <div data-testid="bag-open-request-count">{cart.bagOpenRequestCount}</div>;
};

// Observes cart.draftAttributes via the same public API Bag.tsx reads it
// through, for "Update Bag Item"'s draft-sync effect below.
const DraftAttributesProbe = () => {
  const cart = useCart();
  return <div data-testid="draft-attributes">{JSON.stringify(cart.draftAttributes)}</div>;
};

const renderMintAction = (
  props: Partial<MintActionProps> = {},
  seedItems: { showDate: string; position: number; song: string; serial?: number; lockedAt?: number }[] = []
) =>
  render(
    <CartContextProvider>
      <SeedItems items={seedItems} />
      <MintAction {...baseProps} {...props} />
    </CartContextProvider>
  );

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  associateToken.mockReset();
  useIsTokenAssociatedMock.mockReset().mockReturnValue({
    isAssociated: true,
    isAssociatedLoading: false,
    mutateIsAssociated: vi.fn(),
  });
  vi.mocked(addToBag).mockReset().mockResolvedValue(undefined);
  vi.mocked(fetchStandardJson).mockReset().mockResolvedValue(undefined);
  vi.mocked(openWalletConnectModal).mockReset().mockResolvedValue(undefined);
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
});

afterEach(() => {
  document.getElementById("modal-root")?.remove();
});

describe("MintAction", () => {
  describe("loading", () => {
    it.each([
      ["appConfigStatusLoading", { appConfigStatusLoading: true }],
      ["performanceLoading", { performanceLoading: true }],
      ["accountStatusLoading", { accountStatusLoading: true }],
    ])("shows a checking-availability pill while %s is true", (_name, override) => {
      renderMintAction(override);
      expect(screen.getByText("Checking availability…")).toBeInTheDocument();
    });

    it("shows a checking-availability pill while token association is loading", () => {
      useIsTokenAssociatedMock.mockReturnValue({
        isAssociated: undefined,
        isAssociatedLoading: true,
        mutateIsAssociated: vi.fn(),
      });
      renderMintAction();
      expect(screen.getByText("Checking availability…")).toBeInTheDocument();
    });

    // Regression: appConfigStatusLoading used to be missing from this gate,
    // so collectionMintStatus could still be undefined once the other three
    // loading flags cleared - undefined isn't a case in the exhaustive
    // switch below, so getAction() reached its `default: throw`. Loading
    // still gated correctly is what keeps that switch unreachable in that
    // state.
    it("does not throw when appConfigStatusLoading is true and collectionMintStatus is still undefined", () => {
      expect(() =>
        renderMintAction({ appConfigStatusLoading: true, collectionMintStatus: undefined })
      ).not.toThrow();
      expect(screen.getByText("Checking availability…")).toBeInTheDocument();
    });
  });

  it("shows the serial once minted", () => {
    renderMintAction({ serial: 7 });
    expect(screen.getByText("Already in Someone's Stash · #7")).toBeInTheDocument();
  });

  // Erik's call (session note): an unconnected user seeing the price is
  // intentional, not gated on lockedBy/collection status.
  it("shows the price and opens wallet connect when not connected", async () => {
    renderMintAction({ accountId: null });

    const button = screen.getByRole("button", { name: "Mint: 46 ℏ" });
    fireEvent.click(button);

    expect(openWalletConnectModal).toHaveBeenCalledTimes(1);
  });

  // Bug reported live on preview (2026-08-27): a failed connect attempt
  // (e.g. the wallet's relay subscription failing) used to have nowhere to
  // surface at all - the pill just sat there and nothing else happened.
  it("shows an error when the connect attempt fails", async () => {
    vi.mocked(openWalletConnectModal).mockRejectedValue(new Error("relay error"));
    renderMintAction({ accountId: null });

    fireEvent.click(screen.getByRole("button", { name: "Mint: 46 ℏ" }));

    expect(await screen.findByText("Failed to open wallet connect. Please try again.")).toBeInTheDocument();
  });

  describe("not associated", () => {
    beforeEach(() => {
      useIsTokenAssociatedMock.mockReturnValue({
        isAssociated: false,
        isAssociatedLoading: false,
        mutateIsAssociated: vi.fn(),
      });
    });

    it("prompts to associate the token", () => {
      renderMintAction();
      expect(screen.getByRole("button", { name: "Associate The Token" })).toBeInTheDocument();
    });

    it("calls associateToken and mutates on success", async () => {
      associateToken.mockResolvedValue(true);
      renderMintAction();

      fireEvent.click(screen.getByRole("button", { name: "Associate The Token" }));

      await waitFor(() => expect(associateToken).toHaveBeenCalledTimes(1));
      expect(screen.queryByText("Failed to associate token. Please try again.")).not.toBeInTheDocument();
    });

    it("shows an error if associateToken fails", async () => {
      associateToken.mockResolvedValue(false);
      renderMintAction();

      fireEvent.click(screen.getByRole("button", { name: "Associate The Token" }));

      expect(await screen.findByText("Failed to associate token. Please try again.")).toBeInTheDocument();
    });

    it("shows an error if associateToken throws", async () => {
      associateToken.mockRejectedValue(new Error("network error"));
      renderMintAction();

      fireEvent.click(screen.getByRole("button", { name: "Associate The Token" }));

      expect(await screen.findByText("Failed to associate token. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows minting unavailable when blocked", () => {
    renderMintAction({ isBlocked: true });
    expect(screen.getByText("Minting Unavailable")).toBeInTheDocument();
  });

  describe("in the bag", () => {
    it("shows In Your Bag with no locked-for note while still pending", () => {
      renderMintAction({}, [{ showDate: "1998-07-29", position: 1, song: "Wilson" }]);
      expect(screen.getByText("In Your Bag")).toBeInTheDocument();
      expect(screen.queryByText(/Locked for/)).not.toBeInTheDocument();
    });

    it("shows a locked-for note once ready", () => {
      renderMintAction({}, [
        { showDate: "1998-07-29", position: 1, song: "Wilson", serial: 7, lockedAt: Date.now() },
      ]);
      expect(screen.getByText("In Your Bag")).toBeInTheDocument();
      expect(screen.getByText(/Locked for/)).toBeInTheDocument();
    });
  });

  // "Update Bag Item" (CART.md): mirrors live attribute edits into the
  // cart's draft store while this item sits "ready" in the bag, so the
  // Bag's refresh icon has something to push.
  describe("draft attributes sync (Update Bag Item)", () => {
    it("syncs the current attributes into the cart draft once the item is ready", () => {
      render(
        <CartContextProvider>
          <SeedItems items={[{ showDate: "1998-07-29", position: 1, song: "Wilson", serial: 7 }]} />
          <DraftAttributesProbe />
          <MintAction {...baseProps} attributes={{ song: "Wilson", bgColor: "#000000" } as never} />
        </CartContextProvider>
      );

      expect(screen.getByTestId("draft-attributes")).toHaveTextContent(
        JSON.stringify({ "1998-07-29:1": { song: "Wilson", bgColor: "#000000" } })
      );
    });

    it("does not sync a draft while the item is still pending, not yet ready", () => {
      render(
        <CartContextProvider>
          <SeedItems items={[{ showDate: "1998-07-29", position: 1, song: "Wilson" }]} />
          <DraftAttributesProbe />
          <MintAction {...baseProps} attributes={{ song: "Wilson", bgColor: "#000000" } as never} />
        </CartContextProvider>
      );

      expect(screen.getByTestId("draft-attributes")).toHaveTextContent("{}");
    });

    it("does not sync a draft when this item isn't in the bag at all", () => {
      render(
        <CartContextProvider>
          <DraftAttributesProbe />
          <MintAction {...baseProps} attributes={{ song: "Wilson", bgColor: "#000000" } as never} />
        </CartContextProvider>
      );

      expect(screen.getByTestId("draft-attributes")).toHaveTextContent("{}");
    });

    it("re-syncs when the live attributes change", () => {
      const { rerender } = render(
        <CartContextProvider>
          <SeedItems items={[{ showDate: "1998-07-29", position: 1, song: "Wilson", serial: 7 }]} />
          <DraftAttributesProbe />
          <MintAction {...baseProps} attributes={{ song: "Wilson", bgColor: "#000000" } as never} />
        </CartContextProvider>
      );

      rerender(
        <CartContextProvider>
          <SeedItems items={[{ showDate: "1998-07-29", position: 1, song: "Wilson", serial: 7 }]} />
          <DraftAttributesProbe />
          <MintAction {...baseProps} attributes={{ song: "Wilson", bgColor: "#ffffff" } as never} />
        </CartContextProvider>
      );

      expect(screen.getByTestId("draft-attributes")).toHaveTextContent(
        JSON.stringify({ "1998-07-29:1": { song: "Wilson", bgColor: "#ffffff" } })
      );
    });
  });

  describe("locked", () => {
    it("shows a Release button and locked-for note when locked by the current account", () => {
      renderMintAction({ lockedBy: "0.0.1", lockedAt: Date.now() - 5000 });
      expect(screen.getByText("In Your Bag")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Release" })).toBeInTheDocument();
      expect(screen.getByText(/Locked for/)).toBeInTheDocument();
    });

    it("shows no Release button when locked by someone else", () => {
      renderMintAction({ lockedBy: "0.0.999", lockedAt: Date.now() });
      expect(screen.getByText("Someone's Claiming This")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Release" })).not.toBeInTheDocument();
    });

    // No bag entry seeded here - if one existed, the "in the bag" branch
    // (which has no Release button) would win over this one, since it's
    // checked first. This is the orphaned-claim case Release actually
    // exists for (Finding 52): lockedBy is true server-side with nothing
    // in this browser's cart to show a Remove button for instead.
    it("releases the server-side claim and revalidates the performance on click", async () => {
      const mutatePerformance = vi.fn();
      renderMintAction({ lockedBy: "0.0.1", lockedAt: Date.now(), mutatePerformance });

      fireEvent.click(screen.getByRole("button", { name: "Release" }));

      await waitFor(() =>
        expect(fetchStandardJson).toHaveBeenCalledWith(
          "/api/mint/0.0.1/1998-07-29/1/0/abort",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "USER_CANCELLED" }),
          }
        )
      );
      expect(mutatePerformance).toHaveBeenCalled();
    });
  });

  describe("bag full", () => {
    const fullBag = Array.from({ length: 10 }, (_, i) => ({
      showDate: "1998-07-29",
      position: i + 2,
      song: `Song ${i}`,
    }));

    it("shows the max count when open (10 max)", () => {
      renderMintAction({}, fullBag);
      expect(screen.getByText("Your Bag is Full (10 max)")).toBeInTheDocument();
    });

    it("caps at 1 during presale", () => {
      renderMintAction(
        { collectionMintStatus: CollectionMintStatus.PRE_SALE, isWhitelisted: true },
        [{ showDate: "1998-07-29", position: 2, song: "Song 0" }]
      );
      expect(screen.getByText("Your Bag is Full (1 max)")).toBeInTheDocument();
    });
  });

  describe("collection mint status", () => {
    it("shows Add to Bag when whitelisted during presale", () => {
      renderMintAction({ collectionMintStatus: CollectionMintStatus.PRE_SALE, isWhitelisted: true });
      expect(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" })).toBeInTheDocument();
    });

    it("shows Public Mint date when not whitelisted during presale", () => {
      renderMintAction({ collectionMintStatus: CollectionMintStatus.PRE_SALE, isWhitelisted: false });
      expect(screen.getByText("Public Mint: 9/4")).toBeInTheDocument();
    });

    it("shows paused", () => {
      renderMintAction({ collectionMintStatus: CollectionMintStatus.PAUSED });
      expect(screen.getByText("Minting is currently Paused")).toBeInTheDocument();
    });

    it("shows sold out", () => {
      renderMintAction({ collectionMintStatus: CollectionMintStatus.SOLD_OUT });
      expect(screen.getByText("Sold Out")).toBeInTheDocument();
    });

    it("shows closed", () => {
      renderMintAction({ collectionMintStatus: CollectionMintStatus.CLOSED });
      expect(screen.getByText("Minting has Closed")).toBeInTheDocument();
    });

    it("shows Add to Bag when open", () => {
      renderMintAction({ collectionMintStatus: CollectionMintStatus.OPEN });
      expect(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" })).toBeInTheDocument();
    });
  });

  // Erik's call (CART.md, 2026-08-28): Add to Bag should also open the Bag
  // itself, so the buyer sees both that it landed and that prepare() is
  // actively working on it, not just a pill flip on a page they might
  // navigate away from before checking.
  describe("opening the Bag on Add to Bag", () => {
    it("requests the Bag open when the intro has already been seen", () => {
      localStorage.setItem("dol-bag-intro-seen", "true");
      render(
        <CartContextProvider>
          <BagOpenRequestCounter />
          <MintAction {...baseProps} />
        </CartContextProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" }));

      expect(screen.getByTestId("bag-open-request-count")).toHaveTextContent("1");
    });

    it("requests the Bag open on OK from the intro modal, not before", () => {
      render(
        <CartContextProvider>
          <BagOpenRequestCounter />
          <MintAction {...baseProps} />
        </CartContextProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" }));
      expect(screen.getByTestId("bag-open-request-count")).toHaveTextContent("0");

      fireEvent.click(screen.getByRole("button", { name: "OK" }));
      expect(screen.getByTestId("bag-open-request-count")).toHaveTextContent("1");
    });
  });

  describe("bag intro modal", () => {
    it("adds directly, skipping the modal, once the intro has been seen before", () => {
      localStorage.setItem("dol-bag-intro-seen", "true");
      renderMintAction();

      fireEvent.click(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" }));

      expect(screen.queryByText("Your AC/DC Bag")).not.toBeInTheDocument();
      expect(addToBag).toHaveBeenCalledWith(
        expect.anything(),
        "0.0.1",
        "1998-07-29",
        1,
        { song: "Wilson" }
      );
    });

    it("shows the intro modal the first time, and adds on OK", () => {
      renderMintAction();

      fireEvent.click(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" }));
      expect(screen.getByText("Your AC/DC Bag")).toBeInTheDocument();
      expect(addToBag).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "OK" }));

      expect(addToBag).toHaveBeenCalledWith(
        expect.anything(),
        "0.0.1",
        "1998-07-29",
        1,
        { song: "Wilson" }
      );
      expect(localStorage.getItem("dol-bag-intro-seen")).toBe("true");
    });

    it("does not add on Cancel, and does not mark the intro as seen", async () => {
      renderMintAction();

      fireEvent.click(screen.getByRole("button", { name: "Add to Bag · 46 ℏ" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Modal keeps its content mounted for its close animation - see
      // CLOSE_ANIMATION_MS in Modal.tsx.
      await waitFor(() => expect(screen.queryByText("Your AC/DC Bag")).not.toBeInTheDocument());
      expect(addToBag).not.toHaveBeenCalled();
      // Only OK persists the seen flag - Cancel leaves it unset, so the
      // next click shows the intro modal again rather than adding directly.
      expect(localStorage.getItem("dol-bag-intro-seen")).toBeNull();
    });
  });
});
