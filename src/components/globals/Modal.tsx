import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import ClickAwayListener from "react-click-away-listener";
import { MdClose } from "react-icons/md";
import { twMerge } from "tailwind-merge";

export type BaseModalProps = {
  id: string;
  show: boolean;
  onClose: () => void;
  title?: string;
  // Only needed when there's no visible `title` - the dialog still needs
  // an accessible name from one or the other.
  ariaLabel?: string;
  className?: string;
  showClose?: boolean;
};

export const Modal = ({
  id,
  show,
  onClose,
  title,
  ariaLabel,
  className,
  showClose,
  children,
}: PropsWithChildren<BaseModalProps>) => {
  const [isBrowser, setIsBrowser] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsBrowser(true);
  }, [setIsBrowser]);

  // Minimal WAI-ARIA dialog handling - move focus in on open, restore it to
  // whatever triggered the modal on close. Not a full focus trap (no
  // tab-cycling containment) - just in/out, which is what was missing.
  useEffect(() => {
    if (show) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    } else {
      previouslyFocusedElement.current?.focus();
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [show, onClose]);

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClose();
  };

  const titleId = title ? `${id}-modal-title` : undefined;

  const modalContent = show ? (
    <div
      id={`${id}-modal`}
      className={twMerge(
        "modal-overlay z-30",
        "fixed top-0 left-0",
        "w-full h-full overflow-x-hidden",
        "flex justify-center items-center",
        "bg-black/75",
        className
      )}
    >
      <ClickAwayListener
        onClickAway={() => {
          onClose();
        }}
      >
        <div className="modal-wrapper">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-label={titleId ? undefined : ariaLabel}
            tabIndex={-1}
            className="modal relative mx-8 p-4 rounded-xl bg-dol-dark bg-gray-extra-dark shadow-md"
          >
            {showClose && (
              <button
                type="button"
                aria-label="Close"
                className={twMerge(
                  "absolute top-0 right-0",
                  "flex items-center",
                  "m-2 p-2 rounded-full",
                  "text-gray-medium bg-dol-dark",
                  "hover:text-gray-light hover:bg-gray-dark duration-500",
                )}
                onClick={handleCloseClick}
              >
                <MdClose />
              </button>
            )}
            <div id={titleId} className="text-xl font-light text-center my-0">{title}</div>
            {children}
          </div>
        </div>
      </ClickAwayListener>
    </div>
  ) : null;

  if (isBrowser) {
    return ReactDOM.createPortal(
      modalContent,
      document.getElementById("modal-root")!
    );
  } else {
    return null;
  }
};

export default Modal;
