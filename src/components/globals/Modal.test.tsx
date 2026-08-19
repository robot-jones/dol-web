import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Modal } from "./Modal";

// Modal portals into #modal-root (see app/layout.tsx) - not present by
// default in jsdom, has to be added before each render.
beforeEach(() => {
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
});

afterEach(() => {
  document.getElementById("modal-root")?.remove();
});

describe("Modal", () => {
  it("renders nothing when show is false", () => {
    render(
      <Modal id="test" show={false} onClose={vi.fn()} ariaLabel="Test modal">
        content
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has dialog semantics and an accessible name from title", async () => {
    render(
      <Modal id="test" show title="My Title" onClose={vi.fn()}>
        content
      </Modal>
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("My Title");
  });

  it("falls back to ariaLabel when there's no visible title", async () => {
    render(
      <Modal id="test" show onClose={vi.fn()} ariaLabel="Wallet menu">
        content
      </Modal>
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Wallet menu");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal id="test" show onClose={onClose} ariaLabel="Test modal">
        content
      </Modal>
    );
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not react to other keys", async () => {
    const onClose = vi.fn();
    render(
      <Modal id="test" show onClose={onClose} ariaLabel="Test modal">
        content
      </Modal>
    );
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close button has an aria-label and calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <Modal id="test" show showClose onClose={onClose} ariaLabel="Test modal">
        content
      </Modal>
    );
    const closeButton = await screen.findByRole("button", { name: "Close" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog on open and restores it on close (Finding 38)", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <Modal id="test" show={false} onClose={vi.fn()} ariaLabel="Test modal">
        content
      </Modal>
    );

    rerender(
      <Modal id="test" show onClose={vi.fn()} ariaLabel="Test modal">
        content
      </Modal>
    );
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));

    rerender(
      <Modal id="test" show={false} onClose={vi.fn()} ariaLabel="Test modal">
        content
      </Modal>
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    trigger.remove();
  });
});
