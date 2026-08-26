import { render, screen } from "@testing-library/react";
import { LinkAttribute } from "./LinkAttribute";

// This component branches its rendering by href shape (internal /-prefixed
// path vs. phish.net vs. phish.in vs. any other external link) - one case
// per branch is enough to cover Finding 44's fix (every external branch
// needs target="_blank" + rel="noopener noreferrer"; the internal branch
// uses next/link and shouldn't have either).
describe("LinkAttribute external links (Finding 44)", () => {
  it("opens an external phish.net link in a new tab without leaking window.opener", () => {
    render(<LinkAttribute href="https://phish.net/song/wilson" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("opens an external phish.in link in a new tab without leaking window.opener", () => {
    render(<LinkAttribute href="https://phish.in/show/1997-08-06" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("opens any other external link in a new tab without leaking window.opener", () => {
    render(<LinkAttribute href="https://example.com" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not add target/rel to an internal link", () => {
    render(<LinkAttribute href="/shows/1997-08-06" />);
    const link = screen.getByRole("link");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
