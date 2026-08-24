import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders Footer contents", () => {
    render(<Footer />);
    expect(screen.getByText("built on Hedera")).toBeInTheDocument();
    expect(screen.getByText("by RobotJones")).toBeInTheDocument();
  });

  it("credits phish.net and phish.in with links", () => {
    render(<Footer />);
    const phishNetLink = screen.getByRole("link", { name: "phish.net" });
    expect(phishNetLink).toHaveAttribute("href", "https://phish.net");
    const phishInLink = screen.getByRole("link", { name: "phish.in" });
    expect(phishInLink).toHaveAttribute("href", "https://phish.in");
  });
});


