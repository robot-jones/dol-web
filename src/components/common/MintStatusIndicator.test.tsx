import { render, screen } from "@testing-library/react";
import { MintStatusIndicator, MintStatusIndicatorType } from "./MintStatusIndicator";
import type { MintStatus } from "@/hooks";

// This component imports both useMintStatus and usePerformance via the
// `@/hooks` barrel, which also eagerly loads the real WalletConnect SDK
// (use-wallet-interface.ts) at module-import time - throws in jsdom.
// Full-replace the barrel, matching the established
// StashItem.test.tsx/Wallet.test.tsx pattern.
const mockStatus = vi.fn<() => MintStatus>();
vi.mock("@/hooks", () => ({
  useMintStatus: () => mockStatus(),
  // Never actually exercised in these tests - every case passes
  // `performance` directly, which short-circuits both the fetch and the
  // IntersectionObserver setup before this return value would matter.
  usePerformance: () => ({ performance: undefined, performanceLoading: false }),
}));

describe("MintStatusIndicator", () => {
  it("renders the available state in green", () => {
    mockStatus.mockReturnValue({ label: "Available", color: "green", emoji: "🟢" });
    render(<MintStatusIndicator date="1984-12-01" position={1} performance={{} as never} />);
    expect(screen.getByText("Available")).toHaveClass("text-dol-green");
  });

  it("renders the locked state in yellow", () => {
    mockStatus.mockReturnValue({ label: "Locked", color: "yellow", emoji: "🟡" });
    render(<MintStatusIndicator date="1984-12-01" position={1} performance={{} as never} />);
    expect(screen.getByText("Locked")).toHaveClass("text-dol-yellow");
  });

  it("renders the claimed state in red", () => {
    mockStatus.mockReturnValue({ label: "Claimed", color: "red", emoji: "🔴" });
    render(<MintStatusIndicator date="1984-12-01" position={1} performance={{} as never} />);
    expect(screen.getByText("Claimed")).toHaveClass("text-dol-red");
  });

  it("renders gray as a literal gray class, not a dol color", () => {
    mockStatus.mockReturnValue({ label: "Unknown", color: "gray", emoji: "❓" });
    render(<MintStatusIndicator date="1984-12-01" position={1} performance={{} as never} />);
    expect(screen.getByText("Unknown")).toHaveClass("text-gray-medium");
  });

  it("respects type=Label (no emoji span rendered)", () => {
    mockStatus.mockReturnValue({ label: "Available", color: "green", emoji: "🟢" });
    render(
      <MintStatusIndicator
        date="1984-12-01"
        position={1}
        performance={{} as never}
        type={MintStatusIndicatorType.Label}
      />
    );
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.queryByText("🟢")).not.toBeInTheDocument();
  });

  it("respects type=Emoji (label carried as a title instead of visible text)", () => {
    mockStatus.mockReturnValue({ label: "Available", color: "green", emoji: "🟢" });
    render(
      <MintStatusIndicator
        date="1984-12-01"
        position={1}
        performance={{} as never}
        type={MintStatusIndicatorType.Emoji}
      />
    );
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
    expect(screen.getByTitle("Available")).toBeInTheDocument();
  });
});
