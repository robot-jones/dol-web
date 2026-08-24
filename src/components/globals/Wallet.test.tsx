import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Wallet } from "./Wallet";
import { acceptTermsClient, openWalletConnectModal } from "@/wallet";

const associateToken = vi.fn();
const disconnect = vi.fn();
const mutateIsAssociated = vi.fn();
const useWalletInterfaceMock = vi.fn();
const useIsTokenAssociatedMock = vi.fn();

vi.mock("@/hooks", () => ({
  useWalletInterface: () => useWalletInterfaceMock(),
  useIsTokenAssociated: () => useIsTokenAssociatedMock(),
}));

vi.mock("@/wallet", () => ({
  openWalletConnectModal: vi.fn(),
  acceptTermsClient: vi.fn(),
}));

// Modal portals into #modal-root (see app/layout.tsx) - not present by
// default in jsdom, has to be added before each render.
beforeEach(() => {
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
  associateToken.mockReset();
  disconnect.mockReset();
  mutateIsAssociated.mockReset();
  vi.mocked(openWalletConnectModal).mockReset();
  vi.mocked(acceptTermsClient).mockReset().mockResolvedValue(undefined);
  // Default: already connected - matches the pre-existing associate-token
  // tests below, which are about behavior past the connect step entirely.
  useWalletInterfaceMock.mockReset().mockReturnValue({
    accountId: "0.0.1234",
    walletInterface: { associateToken, disconnect },
  });
  useIsTokenAssociatedMock.mockReset().mockReturnValue({
    isAssociated: false,
    mutateIsAssociated,
  });
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

describe("Wallet connect consent flow", () => {
  beforeEach(() => {
    useWalletInterfaceMock.mockReturnValue({
      accountId: "",
      walletInterface: undefined,
    });
  });

  const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Account" }));
  const clickConnect = () => fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));

  it("shows Connect Wallet, not the consent step, before it's clicked", () => {
    render(<Wallet />);
    openMenu();

    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows the consent checkbox with Agree & Connect disabled until checked", () => {
    render(<Wallet />);
    openMenu();
    clickConnect();

    const checkbox = screen.getByRole("checkbox");
    const agreeButton = screen.getByRole("button", { name: "Agree & Connect" });
    expect(agreeButton).toBeDisabled();

    fireEvent.click(checkbox);
    expect(agreeButton).not.toBeDisabled();
  });

  it("opens the wallet connector on Agree and closes the menu", async () => {
    render(<Wallet />);
    openMenu();
    clickConnect();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Agree & Connect" }));

    expect(openWalletConnectModal).toHaveBeenCalledTimes(1);
    // Modal.tsx keeps the dialog mounted through its close animation - see
    // CLOSE_ANIMATION_MS - so this only clears asynchronously.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("Back returns to the normal menu without opening the connector", () => {
    render(<Wallet />);
    openMenu();
    clickConnect();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(openWalletConnectModal).not.toHaveBeenCalled();
  });

  it("persists acceptance once accountId becomes available after Agree", async () => {
    const { rerender } = render(<Wallet />);
    openMenu();
    clickConnect();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Agree & Connect" }));

    expect(acceptTermsClient).not.toHaveBeenCalled();

    // Simulate the wallet connector resolving - accountId becomes available
    // via the hook, same as a real connect completing.
    useWalletInterfaceMock.mockReturnValue({
      accountId: "0.0.9999",
      walletInterface: { associateToken, disconnect },
    });
    rerender(<Wallet />);

    await waitFor(() => expect(acceptTermsClient).toHaveBeenCalledWith("0.0.9999"));
  });

  it("does not persist acceptance for a wallet that's already connected without ever going through Agree in this session", () => {
    // accountId present from the very first render - e.g. a session the
    // wallet library restored on its own - with no Agree click having
    // happened in this component's lifetime.
    useWalletInterfaceMock.mockReturnValue({
      accountId: "0.0.9999",
      walletInterface: { associateToken, disconnect },
    });
    render(<Wallet />);

    expect(acceptTermsClient).not.toHaveBeenCalled();
  });

  it("opens the Terms of Service and Privacy Policy links in a new tab so checkbox state isn't lost", () => {
    render(<Wallet />);
    openMenu();
    clickConnect();

    const checkbox = screen.getByRole("checkbox");
    const consentLabel = checkbox.closest("label") as HTMLElement;
    const tosLink = within(consentLabel).getByRole("link", { name: "Terms of Service" });
    const privacyLink = within(consentLabel).getByRole("link", { name: "Privacy Policy" });
    expect(tosLink).toHaveAttribute("target", "_blank");
    expect(tosLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(privacyLink).toHaveAttribute("target", "_blank");
    expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
