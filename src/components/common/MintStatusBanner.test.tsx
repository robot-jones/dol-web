import { render, screen } from "@testing-library/react";
import { MintStatusBanner } from "./MintStatusBanner";
import type { MintStatus } from "@/hooks";

// MintStatusBanner imports useMintStatus via the `@/hooks` barrel, which
// also re-exports use-wallet-interface.ts - eagerly loading the real
// WalletConnect SDK at module-import time, which throws in jsdom
// (`window.matchMedia is not a function`). Full-replace the barrel with a
// fake, same pattern StashItem.test.tsx/Wallet.test.tsx already use for
// this exact reason - useMintStatus's own derivation logic is covered
// directly in use-mint-status.test.tsx, so faking its output here keeps
// this file focused on "does the component render what the hook says."
const mockStatus = vi.fn<() => MintStatus>();
vi.mock("@/hooks", () => ({
  useMintStatus: () => mockStatus(),
}));

describe("MintStatusBanner", () => {
  it("shows plain-language copy and the color for the available state", () => {
    mockStatus.mockReturnValue({ label: "Available", color: "green", emoji: "🟢" });
    render(<MintStatusBanner />);
    expect(screen.getByText("Available to mint")).toBeInTheDocument();
    expect(screen.getByText("Available to mint").closest("div")).toHaveClass("text-dol-green");
  });

  it("shows plain-language copy for the locked state", () => {
    mockStatus.mockReturnValue({ label: "Locked", color: "yellow", emoji: "🟡" });
    render(<MintStatusBanner />);
    expect(screen.getByText("Someone's claiming this")).toBeInTheDocument();
  });

  it("shows plain-language copy for the claimed state", () => {
    mockStatus.mockReturnValue({ label: "Claimed", color: "red", emoji: "🔴" });
    render(<MintStatusBanner />);
    expect(screen.getByText("Already in someone's stash")).toBeInTheDocument();
  });

  it("shows plain-language copy for the loading state", () => {
    mockStatus.mockReturnValue({ label: "Loading", color: "gray", emoji: "spinner" });
    render(<MintStatusBanner />);
    expect(screen.getByText("Checking availability…")).toBeInTheDocument();
  });

  it("shows plain-language copy for the unknown state, styled gray not a dol color", () => {
    mockStatus.mockReturnValue({ label: "Unknown", color: "gray", emoji: "❓" });
    render(<MintStatusBanner />);
    const text = screen.getByText("Status unavailable");
    expect(text).toBeInTheDocument();
    expect(text.closest("div")).toHaveClass("text-gray-light");
  });

  it("merges a passed className onto the banner", () => {
    mockStatus.mockReturnValue({ label: "Available", color: "green", emoji: "🟢" });
    const { container } = render(<MintStatusBanner className="max-w-[374px]" />);
    expect(container.firstChild).toHaveClass("max-w-[374px]");
  });
});
