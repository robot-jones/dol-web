import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Wallet } from "./Wallet";

const associateToken = vi.fn();
const mutateIsAssociated = vi.fn();

vi.mock("@/hooks", () => ({
  useWalletInterface: () => ({
    accountId: "0.0.1234",
    walletInterface: { associateToken, disconnect: vi.fn() },
  }),
  useIsTokenAssociated: () => ({
    isAssociated: false,
    mutateIsAssociated,
  }),
}));

vi.mock("@/wallet", () => ({
  openWalletConnectModal: vi.fn(),
}));

// Modal portals into #modal-root (see app/layout.tsx) - not present by
// default in jsdom, has to be added before each render.
beforeEach(() => {
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
  associateToken.mockReset();
  mutateIsAssociated.mockReset();
});

afterEach(() => {
  document.getElementById("modal-root")?.remove();
});

describe("Wallet associate-token error handling (Finding 46)", () => {
  const openMenu = async () => {
    fireEvent.click(screen.getByRole("button", { name: "0.0.1234" }));
    return screen.findByRole("button", { name: "Associate Token" });
  };

  it("closes the modal and updates state on success", async () => {
    associateToken.mockResolvedValue(true);
    render(<Wallet />);
    const associateButton = await openMenu();

    fireEvent.click(associateButton);

    await waitFor(() => expect(mutateIsAssociated).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows an error and keeps the modal open when associateToken returns false", async () => {
    associateToken.mockResolvedValue(false);
    render(<Wallet />);
    const associateButton = await openMenu();

    fireEvent.click(associateButton);

    expect(await screen.findByText("Failed to associate token. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mutateIsAssociated).not.toHaveBeenCalled();
  });

  it("shows an error and keeps the modal open when associateToken throws", async () => {
    associateToken.mockRejectedValue(new Error("wallet rejected"));
    render(<Wallet />);
    const associateButton = await openMenu();

    fireEvent.click(associateButton);

    expect(await screen.findByText("Failed to associate token. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears a stale error the next time the menu is opened", async () => {
    associateToken.mockResolvedValue(false);
    render(<Wallet />);
    const associateButton = await openMenu();
    fireEvent.click(associateButton);
    await screen.findByText("Failed to associate token. Please try again.");

    // Close (Cancel) then reopen - the old error shouldn't still be there.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openMenu();

    expect(screen.queryByText("Failed to associate token. Please try again.")).not.toBeInTheDocument();
  });
});
