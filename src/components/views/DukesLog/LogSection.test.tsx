import { render, screen, fireEvent } from "@testing-library/react";
import { LogSection } from "./LogSection";

// The expand/collapse header is local UI state, independent of the
// useAuditLogs SWR fetch (which has no mock/harness here, same accepted
// gap as Performance.tsx elsewhere in this doc) - the fetch itself is left
// unmocked and free to fail in jsdom; only the header's own behavior,
// which renders unconditionally, is under test.
describe("LogSection header (Finding 40)", () => {
  it("is a real keyboard-reachable button that reports its expanded state", () => {
    render(<LogSection title="Test Section" logKey="test-key" />);
    const header = screen.getByRole("button", { name: "Test Section" });
    expect(header).toHaveAttribute("tabindex", "0");
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles aria-expanded on click", () => {
    render(<LogSection title="Test Section" logKey="test-key" />);
    const header = screen.getByRole("button", { name: "Test Section" });
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles on Enter and Space from the keyboard", () => {
    render(<LogSection title="Test Section" logKey="test-key" />);
    const header = screen.getByRole("button", { name: "Test Section" });
    fireEvent.keyDown(header, { key: "Enter" });
    expect(header).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(header, { key: " " });
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("does not react to other keys", () => {
    render(<LogSection title="Test Section" logKey="test-key" />);
    const header = screen.getByRole("button", { name: "Test Section" });
    fireEvent.keyDown(header, { key: "a" });
    expect(header).toHaveAttribute("aria-expanded", "false");
  });
});
