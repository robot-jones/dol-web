import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("renders and focuses input on mount", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Find" />);
    const input = screen.getByRole("textbox", { name: "Find" });
    expect(input).toHaveFocus();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Search" />);
    const input = screen.getByRole("textbox", { name: "Search" });
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("clicking container focuses the input", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Search" />);
    const container = screen.getByRole("search");
    container.click();
    const input = screen.getByRole("textbox", { name: "Search" });
    expect(input).toHaveFocus();
  });
});


