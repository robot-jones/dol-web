import { render, screen, fireEvent } from "@testing-library/react";
import { Location } from "./Location";

describe("Location list items keyboard support (Finding 56)", () => {
  const targets: [string, number][] = [
    ["Missouri", 20],
    ["Illinois", 5],
  ];

  it("every item is a keyboard-reachable button", () => {
    render(<Location name="USA" targets={targets} locationType="state" jumpTo={vi.fn()} />);
    const items = screen.getAllByRole("button");
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item).toHaveAttribute("tabindex", "0");
    }
  });

  it("jumps on click and on Enter/Space from the keyboard", () => {
    const jumpTo = vi.fn();
    render(<Location name="USA" targets={targets} locationType="state" jumpTo={jumpTo} />);

    fireEvent.click(screen.getByRole("button", { name: /Missouri/ }));
    expect(jumpTo).toHaveBeenNthCalledWith(1, "state", "Missouri");

    fireEvent.keyDown(screen.getByRole("button", { name: /Illinois/ }), { key: "Enter" });
    expect(jumpTo).toHaveBeenNthCalledWith(2, "state", "Illinois");

    fireEvent.keyDown(screen.getByRole("button", { name: /Illinois/ }), { key: " " });
    expect(jumpTo).toHaveBeenNthCalledWith(3, "state", "Illinois");
  });

  it("does not react to other keys", () => {
    const jumpTo = vi.fn();
    render(<Location name="USA" targets={targets} locationType="state" jumpTo={jumpTo} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /Missouri/ }), { key: "a" });
    expect(jumpTo).not.toHaveBeenCalled();
  });
});
