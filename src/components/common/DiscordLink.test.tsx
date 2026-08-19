import { render, screen } from "@testing-library/react";
import { DiscordLink } from "./DiscordLink";

describe("DiscordLink", () => {
  it("has a real accessible name, not just a title (Finding 39)", () => {
    render(<DiscordLink />);
    const link = screen.getByRole("link", { name: "Duke of Lizards Discord" });
    expect(link).toHaveAttribute("href", "https://discord.gg/WpaDkMxEJ9");
  });
});
