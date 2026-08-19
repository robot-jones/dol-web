import { render, screen, fireEvent } from "@testing-library/react";
import { Date } from "./Date";

describe("Date list items keyboard support (Finding 56)", () => {
  const targets: [string, number][] = [
    ["1997", 12],
    ["1998", 8],
  ];

  it("every item is a keyboard-reachable button", () => {
    render(<Date name="1.0" targets={targets} dateType="year" jumpTo={vi.fn()} />);
    const items = screen.getAllByRole("button");
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item).toHaveAttribute("tabindex", "0");
    }
  });

  it("jumps on click and on Enter/Space from the keyboard", () => {
    const jumpTo = vi.fn();
    render(<Date name="1.0" targets={targets} dateType="year" jumpTo={jumpTo} />);

    fireEvent.click(screen.getByRole("button", { name: /1997/ }));
    expect(jumpTo).toHaveBeenNthCalledWith(1, "year", "1997");

    fireEvent.keyDown(screen.getByRole("button", { name: /1998/ }), { key: "Enter" });
    expect(jumpTo).toHaveBeenNthCalledWith(2, "year", "1998");

    fireEvent.keyDown(screen.getByRole("button", { name: /1998/ }), { key: " " });
    expect(jumpTo).toHaveBeenNthCalledWith(3, "year", "1998");
  });

  it("does not react to other keys", () => {
    const jumpTo = vi.fn();
    render(<Date name="1.0" targets={targets} dateType="year" jumpTo={jumpTo} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /1997/ }), { key: "a" });
    expect(jumpTo).not.toHaveBeenCalled();
  });
});
