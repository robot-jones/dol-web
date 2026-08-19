import { render, screen } from "@testing-library/react";
import { DropDownAttribute } from "./DropDownAttribute";

describe("DropDownAttribute label association (Finding 41)", () => {
  it("associates the visible label with the select via a real <label>", () => {
    render(
      <DropDownAttribute
        id="background-attribute"
        label="Background"
        options={[{ label: "Blue", value: "blue" }]}
        onChange={vi.fn()}
      />
    );
    // Only resolves if <label htmlFor> really points at the <select>'s id -
    // fails the same way a screen reader would fail to announce it.
    const select = screen.getByLabelText("Background");
    expect(select.tagName).toBe("SELECT");
  });

  it("renders no label element when label is omitted", () => {
    render(
      <DropDownAttribute
        id="donut-attribute"
        options={[{ label: "Red", value: "red" }]}
        onChange={vi.fn()}
      />
    );
    expect(document.querySelector("label")).not.toBeInTheDocument();
  });
});
