import { render } from "@testing-library/react";
import { Loading } from "./Loading";

vi.mock("@erikmuir/dol-lib/dapp", async () => {
  const actual = await vi.importActual("@erikmuir/dol-lib/dapp");
  return {
    ...actual,
    getLyricByCategory: () => [
      [{ text: "line1" }],
      [{ text: "line2", highlight: true }],
    ],
  };
});

describe("Loading", () => {
  it("renders without crashing", () => {
    const { container } = render(<Loading sizeInPixels={100} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("announces itself to screen readers (Finding 43)", () => {
    // role="status" is what makes a screen reader announce this region as
    // it appears - what actually gets read aloud is its live-region text
    // content (this sr-only span), not an "accessible name" in the
    // name-from-content sense (status doesn't support that per the ARIA
    // spec, confirmed empirically - toHaveAccessibleName comes back empty
    // even with the span present).
    const { getByRole } = render(<Loading sizeInPixels={100} />);
    const status = getByRole("status");
    expect(status).toHaveTextContent("Loading...");
  });

  it("renders lyric when showLyric is true", () => {
    const { getByText } = render(<Loading showLyric />);
    expect(getByText("line1")).toBeInTheDocument();
    expect(getByText("line2")).toBeInTheDocument();
  });
});


