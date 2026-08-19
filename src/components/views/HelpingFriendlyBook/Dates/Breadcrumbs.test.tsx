import { render, screen, fireEvent } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Dates Breadcrumbs keyboard support (Finding 56)", () => {
  it("renders nothing without an era", () => {
    const { container } = render(<Breadcrumbs jumpTo={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("every crumb is a keyboard-reachable button", () => {
    render(<Breadcrumbs era="1.0" year="1997" jumpTo={vi.fn()} />);
    const crumbs = screen.getAllByRole("button");
    expect(crumbs).toHaveLength(2); // "Eras" root + era
    for (const crumb of crumbs) {
      expect(crumb).toHaveAttribute("tabindex", "0");
    }
  });

  it("jumps on click and on Enter/Space from the keyboard", () => {
    const jumpTo = vi.fn();
    render(<Breadcrumbs era="1.0" year="1997" month="6" jumpTo={jumpTo} />);

    fireEvent.click(screen.getByRole("button", { name: "1.0" }));
    expect(jumpTo).toHaveBeenNthCalledWith(1, "era", "1.0");

    fireEvent.keyDown(screen.getByRole("button", { name: "1997" }), { key: "Enter" });
    expect(jumpTo).toHaveBeenNthCalledWith(2, "year", "1997");

    fireEvent.keyDown(screen.getByRole("button", { name: "1997" }), { key: " " });
    expect(jumpTo).toHaveBeenNthCalledWith(3, "year", "1997");
  });

  it("does not react to other keys", () => {
    const jumpTo = vi.fn();
    render(<Breadcrumbs era="1.0" year="1997" jumpTo={jumpTo} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "1.0" }), { key: "a" });
    expect(jumpTo).not.toHaveBeenCalled();
  });
});
