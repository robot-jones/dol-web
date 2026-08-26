import { render, screen } from "@testing-library/react";
import { DataAttribute } from "./DataAttribute";

describe("DataAttribute external links (Finding 44)", () => {
  it("opens an external link in a new tab without leaking window.opener", () => {
    render(<DataAttribute data="phish.in" href="https://phish.in/1997-08-06" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not add target/rel to an internal link", () => {
    render(<DataAttribute data="NICU" href="/shows/1997-08-06/1" />);
    const link = screen.getByRole("link");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
