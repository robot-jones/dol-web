import { render, screen } from "@testing-library/react";
import { DolButton } from "./DolButton";

describe("DolButton", () => {
  it("renders a native button when no href is given", () => {
    render(<DolButton>Click me</DolButton>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("disables a plain button natively", () => {
    render(<DolButton disabled>Click me</DolButton>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeDisabled();
  });

  it("renders a real link when href is given", () => {
    render(<DolButton href="/terms-of-service">Terms</DolButton>);
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link).toHaveAttribute("href", "/terms-of-service");
  });

  it("marks a disabled link as actually disabled (Finding 34)", () => {
    render(
      <DolButton href="/terms-of-service" disabled>
        Terms
      </DolButton>
    );
    const link = screen.getByRole("link", { name: "Terms" });
    // Real href preserved (not swapped to "#") - interaction is blocked via
    // aria-disabled/tabIndex/pointer-events, same pattern FilterTypePicker
    // already used, not by rewriting the destination.
    expect(link).toHaveAttribute("href", "/terms-of-service");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabIndex", "-1");
    expect(link.className).toContain("pointer-events-none");
  });
});
