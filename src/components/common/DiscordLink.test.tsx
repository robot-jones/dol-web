import { render, screen } from "@testing-library/react";
import { DiscordLink } from "./DiscordLink";

describe("DiscordLink", () => {
  it("has a real accessible name, not just a title (Finding 39)", () => {
    render(<DiscordLink />);
    const link = screen.getByRole("link", { name: "Duke of Lizards Discord" });
    expect(link).toHaveAttribute("href", "https://discord.gg/WpaDkMxEJ9");
  });

  it("opens in a new tab without leaking window.opener (Finding 44)", () => {
    render(<DiscordLink />);
    const link = screen.getByRole("link", { name: "Duke of Lizards Discord" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
