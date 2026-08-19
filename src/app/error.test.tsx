import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./error";

describe("Error boundary (Finding 47)", () => {
  const error = Object.assign(new Error("secret db connection string leaked here"), {
    digest: "abc123",
  });

  it("logs the error instead of showing its message to the user", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary error={error} reset={vi.fn()} />);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(screen.queryByText(/secret db connection string/)).not.toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("calls reset when Try again is clicked", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<ErrorBoundary error={error} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });
});
