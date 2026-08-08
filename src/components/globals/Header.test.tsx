import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

vi.mock("./Wallet", () => ({ Wallet: () => <div>Wallet</div> }));
vi.mock("./Nav", () => ({ Nav: () => <nav>Nav</nav> }));
vi.mock("../common/DiscordLink", () => ({ DiscordLink: () => <div>Discord</div> }));
vi.mock("../common/Shapes", () => ({ Shapes: () => <div>Shapes</div> }));

describe("Header", () => {
  it("renders Header contents", () => {
    render(<Header />);
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Nav")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByTitle("Can you still have fun?")).toBeInTheDocument();
  });
});


