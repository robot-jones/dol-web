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

  it("renders lyric when showLyric is true", () => {
    const { getByText } = render(<Loading showLyric />);
    expect(getByText("line1")).toBeInTheDocument();
    expect(getByText("line2")).toBeInTheDocument();
  });
});


