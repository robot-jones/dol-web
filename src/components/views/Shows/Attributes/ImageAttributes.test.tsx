import { render, screen, fireEvent } from "@testing-library/react";
import { DolColorHex } from "@erikmuir/dol-lib/types";
import { ImageAttributes } from "./ImageAttributes";

const baseProps = {
  bgColor: DolColorHex.Blue,
  handleBgColorChanged: vi.fn(),
  handleDonutChanged: vi.fn(),
  handleSubjectChanged: vi.fn(),
};

describe("ImageAttributes randomize control (Finding 39)", () => {
  it("is announced as a real button, not just a tooltip title", () => {
    render(
      <ImageAttributes
        {...baseProps}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    const control = screen.getByRole("button", { name: "Randomize" });
    expect(control).toHaveAttribute("tabindex", "0");
  });

  it("is not rendered once minted", () => {
    render(
      <ImageAttributes
        {...baseProps}
        minted
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Randomize" })).not.toBeInTheDocument();
  });

  it("fires onClick", () => {
    const handleRandomizeClick = vi.fn();
    render(
      <ImageAttributes
        {...baseProps}
        handleRandomizeClick={handleRandomizeClick}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Randomize" }));
    expect(handleRandomizeClick).toHaveBeenCalledTimes(1);
  });

  it("wires keydown through for keyboard activation", () => {
    const handleRandomizeKeyDown = vi.fn();
    render(
      <ImageAttributes
        {...baseProps}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={handleRandomizeKeyDown}
      />
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Randomize" }), { key: "Enter" });
    expect(handleRandomizeKeyDown).toHaveBeenCalledTimes(1);
  });
});
