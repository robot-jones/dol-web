import { render, screen, fireEvent } from "@testing-library/react";
import { MintedPerformancesSection } from "./MintedPerformancesSection";

// Same accepted gap as LogSection.test.tsx: useMintedPerformances' SWR
// fetch is left unmocked and free to fail in jsdom - only the header's own
// behavior, which renders unconditionally, is under test.
describe("MintedPerformancesSection header", () => {
  it("is a real keyboard-reachable button that reports its expanded state", () => {
    render(<MintedPerformancesSection />);
    const header = screen.getByRole("button", { name: "Minted Performances" });
    expect(header).toHaveAttribute("tabindex", "0");
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles aria-expanded on click", () => {
    render(<MintedPerformancesSection />);
    const header = screen.getByRole("button", { name: "Minted Performances" });
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles on Enter and Space from the keyboard", () => {
    render(<MintedPerformancesSection />);
    const header = screen.getByRole("button", { name: "Minted Performances" });
    fireEvent.keyDown(header, { key: "Enter" });
    expect(header).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(header, { key: " " });
    expect(header).toHaveAttribute("aria-expanded", "false");
  });
});
