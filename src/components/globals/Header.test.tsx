import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

vi.mock("./Wallet", () => ({ Wallet: () => <div>Wallet</div> }));
vi.mock("./Bag", () => ({ Bag: () => <div>Bag</div> }));
vi.mock("./Nav", () => ({ Nav: () => <nav>Nav</nav> }));
vi.mock("../common/Shapes", () => ({ Shapes: () => <div>Shapes</div> }));

describe("Header", () => {
  it("renders Header contents", () => {
    render(<Header />);
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Bag")).toBeInTheDocument();
    expect(screen.getByText("Nav")).toBeInTheDocument();
    expect(screen.getByTitle("Can you still have fun?")).toBeInTheDocument();
  });

  // Erik's call (2026-08-28): the header's own Discord icon was redundant
  // with the Home page's much more prominent one (60px + text vs. 24px
  // icon-only) - removed rather than kept as a second, smaller entry point.
  it("does not render a Discord link - that's the Home page's job now", () => {
    render(<Header />);
    expect(screen.queryByText("Discord")).not.toBeInTheDocument();
  });

  it("opens the wilson.com easter egg in a new tab without leaking window.opener (Finding 44)", () => {
    render(<Header />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://wilson.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});


