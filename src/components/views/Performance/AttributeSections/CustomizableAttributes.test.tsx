import { render, screen, fireEvent } from "@testing-library/react";
import { DolColorHex, Subject } from "@erikmuir/dol-lib/types";
import { CustomizableAttributes } from "./CustomizableAttributes";

const baseProps = {
  bgColor: DolColorHex.Blue,
  handleBgColorChanged: vi.fn(),
  handleDonutChanged: vi.fn(),
  handleSubjectChanged: vi.fn(),
  handleInscriptionChanged: vi.fn(),
};

describe("CustomizableAttributes randomize control (Finding 39)", () => {
  it("is announced as a real button, not just a tooltip title", () => {
    render(
      <CustomizableAttributes
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
      <CustomizableAttributes
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
      <CustomizableAttributes
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
      <CustomizableAttributes
        {...baseProps}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={handleRandomizeKeyDown}
      />
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Randomize" }), { key: "Enter" });
    expect(handleRandomizeKeyDown).toHaveBeenCalledTimes(1);
  });
});

describe("CustomizableAttributes once minted", () => {
  it("shows read-only values instead of pickers - permanent on-chain facts, not a disabled form", () => {
    render(
      <CustomizableAttributes
        {...baseProps}
        minted
        donut={DolColorHex.Red}
        subject={Subject.Lizard}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Lizard")).toBeInTheDocument();
  });

  it("falls back to the shared --null-- treatment when there's no donut", () => {
    render(
      <CustomizableAttributes
        {...baseProps}
        minted
        subject={Subject.Lizard}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    expect(screen.getByText("--null--")).toBeInTheDocument();
  });

  // Minted inscription display moved to PerformanceInscription (a caption
  // under the image, not a Details-panel tile) - this component no longer
  // renders it at all once minted, so there's nothing left to assert here.
});

describe("CustomizableAttributes inscription input", () => {
  it("reflects the current value and reports edits", () => {
    const handleInscriptionChanged = vi.fn();
    render(
      <CustomizableAttributes
        {...baseProps}
        inscription="hello"
        handleInscriptionChanged={handleInscriptionChanged}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    const input = screen.getByLabelText("Inscription (optional)") as HTMLInputElement;
    expect(input.value).toBe("hello");
    fireEvent.change(input, { target: { value: "hello there" } });
    expect(handleInscriptionChanged).toHaveBeenCalledWith("hello there");
  });

  it("caps input length at MAX_INSCRIPTION_LENGTH via maxLength", () => {
    render(
      <CustomizableAttributes
        {...baseProps}
        handleRandomizeClick={vi.fn()}
        handleRandomizeKeyDown={vi.fn()}
      />
    );
    const input = screen.getByLabelText("Inscription (optional)") as HTMLInputElement;
    expect(input.maxLength).toBe(100);
  });
});
