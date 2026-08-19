import { render, screen, fireEvent } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Locations Breadcrumbs keyboard support (Finding 56)", () => {
  it("renders nothing without a country", () => {
    const { container } = render(<Breadcrumbs jumpTo={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("every crumb is a keyboard-reachable button", () => {
    render(<Breadcrumbs country="USA" state="MO" city="Maryland Heights" jumpTo={vi.fn()} />);
    const crumbs = screen.getAllByRole("button");
    expect(crumbs).toHaveLength(3); // "Earth" root + country + state (no venue, so no city crumb)
    for (const crumb of crumbs) {
      expect(crumb).toHaveAttribute("tabindex", "0");
    }
  });

  it("jumps on click and on Enter/Space from the keyboard", () => {
    const jumpTo = vi.fn();
    render(
      <Breadcrumbs country="USA" state="MO" city="Maryland Heights" venue="Riverport Amphitheater" jumpTo={jumpTo} />
    );

    fireEvent.click(screen.getByRole("button", { name: "USA" }));
    expect(jumpTo).toHaveBeenNthCalledWith(1, "country", "USA");

    fireEvent.keyDown(screen.getByRole("button", { name: "Missouri" }), { key: "Enter" });
    expect(jumpTo).toHaveBeenNthCalledWith(2, "state", "MO");

    fireEvent.keyDown(screen.getByRole("button", { name: "Maryland Heights" }), { key: " " });
    expect(jumpTo).toHaveBeenNthCalledWith(3, "city", "Maryland Heights");
  });

  it("does not react to other keys", () => {
    const jumpTo = vi.fn();
    render(<Breadcrumbs country="USA" state="MO" jumpTo={jumpTo} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "USA" }), { key: "a" });
    expect(jumpTo).not.toHaveBeenCalled();
  });
});
