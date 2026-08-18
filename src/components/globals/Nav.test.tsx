import { render, screen } from "@testing-library/react";
import { Nav } from "./Nav";

describe("Nav", () => {
  it("renders tabs and back button", () => {
    render(<Nav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("sizes tabs with flex-1, not a fixed width that overflows the row (Finding 35)", () => {
    render(<Nav />);
    const tabs = screen.getAllByRole("link");
    expect(tabs).toHaveLength(4);
    for (const tab of tabs) {
      // 4 tabs x w-1/4 (25% each) + 3 gaps of gap-4 is wider than the row
      // by construction - flex-1 lets flexbox divide the remaining space
      // (container width minus gaps) evenly instead.
      expect(tab.className).toContain("flex-1");
      expect(tab.className).not.toContain("w-1/4");
    }
  });
});


