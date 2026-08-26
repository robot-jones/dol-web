import { render, screen, fireEvent } from "@testing-library/react";
import { AttributePickerShell } from "./AttributePickerShell";

const options = [
  { label: "None", value: undefined },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
  { label: "Red", value: "red" },
];

describe("AttributePickerShell", () => {
  it("associates the visible label with the trigger", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    expect(screen.getByLabelText("Background")).toBeInTheDocument();
  });

  it("renders no label element when label is omitted", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        options={options}
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    expect(document.querySelector("label")).not.toBeInTheDocument();
  });

  it("shows the current value's label on the closed trigger", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        currentValue="green"
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Green");
  });

  it("opens the listbox on click and renders every option", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(options.length);
  });

  it("marks the current value's option as selected", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        currentValue="red"
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    const redOption = screen.getByRole("option", { name: "Red" });
    expect(redOption).toHaveAttribute("aria-selected", "true");
  });

  it("selects an option on click, calls onChange, and closes", () => {
    const onChange = vi.fn();
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        onChange={onChange}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Blue"));
    expect(onChange).toHaveBeenCalledWith("blue");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens on ArrowDown from the trigger", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("moves the active option with Arrow keys and selects it with Enter", () => {
    const onChange = vi.fn();
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        onChange={onChange}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    // Starts on index 0 ("None") since nothing is currently selected -
    // two ArrowDowns lands on "Green" (index 2).
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("green");
  });

  it("closes on Escape without changing the selection", () => {
    const onChange = vi.fn();
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        onChange={onChange}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not open when disabled", () => {
    render(
      <AttributePickerShell
        id="test-attribute"
        label="Background"
        options={options}
        disabled
        onChange={vi.fn()}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
