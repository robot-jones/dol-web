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
  // Opt-in full-page bg-black/75 backdrop (dropped entirely in Phase 9 -
  // see PUNCHLIST.md - because the one caller at the time, Wallet.tsx's
  // account menu, is a low-stakes anchored dropdown that a dimmed backdrop
  // overstated). A real confirm/cancel dialog is exactly the case that
  // backdrop signal is for, so it's back as an opt-in rather than reverting
  // Wallet.tsx's now-correct undimmed look.
  dim?: boolean;
};

// Matches the nav tabs' ease-in-out "lowered on a cable" slide (Nav.tsx's
// bottom-position transition) rather than a generic fade - same easing and
// vertical-drop motion, but shortened from the nav's decorative 1000ms
// hover flourish. A functional open/close someone's actively waiting on
// (and that Wallet.test.tsx asserts against with RTL's default 1000ms
// waitFor timeout) shouldn't take a full second either way.
const CLOSE_ANIMATION_MS = 300;

export const Modal = ({
  id,
  show,
  onClose,
  title,
  ariaLabel,
  className,
  showClose,
  dim,
  children,
}: PropsWithChildren<BaseModalProps>) => {
  const [isBrowser, setIsBrowser] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsBrowser(true);
  }, [setIsBrowser]);

  // `mounted` keeps the dialog in the DOM for CLOSE_ANIMATION_MS after
  // `show` goes false, so the closing transition has something to animate
  // instead of vanishing instantly. `visible` is the actual CSS trigger -
  // flipped a frame after mount (not in the same tick) so the browser
  // paints the "closed" position first; flipping both at once would let
  // the element mount already in its open state with nothing to animate
  // from.
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      // A single rAF isn't a reliable guarantee the browser has actually
      // painted the just-mounted closed state before we flip to visible -
      // it can fire early enough that the two style changes get coalesced
      // into one, so the enter transition never plays (only exit did,
      // since that flips an already-painted element). Nesting a second rAF
      // inside the first is the standard fix: the first guarantees we're
      // past the current paint, the second runs only after that.
      let inner: number | undefined;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        if (inner !== undefined) cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [show]);

  // Minimal WAI-ARIA dialog handling - move focus in on open, restore it to
  // whatever triggered the modal on close. Not a full focus trap (no
  // tab-cycling containment) - just in/out, which is what was missing.
  //
  // Keyed on `mounted`, not `show` - `mounted` lags a render behind `show`
  // (it flips inside the effect above, so the dialog isn't in the DOM yet
  // on the same pass `show` turns true). Focusing here on `show` instead
  // would hit `dialogRef.current` while it's still null.
  useEffect(() => {
    if (mounted) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    }
  }, [mounted]);

  // Restoring focus back out isn't tied to the close animation/unmount
  // delay - happens as soon as the caller actually closes it.
  useEffect(() => {
    if (!show) {
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

  const modalContent = mounted ? (
    <div
      id={`${id}-modal`}
      className={twMerge(
        "modal-overlay z-30",
        "fixed top-0 left-0",
        "w-full h-full overflow-x-hidden",
        "flex justify-center items-center",
        // No backdrop tint by default - a full-page bg-black/75 was sending
        // a "modal" signal the wallet-menu dropdown's already-anchored,
        // low-stakes case doesn't back up (see PUNCHLIST.md Phase 9).
        // Click-away/Escape still close it either way; `dim` opts back into
        // the tint for callers that are an actual modal, not a dropdown.
        dim ? "bg-black/75" : "bg-transparent",
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
            className={twMerge(
              "modal relative mx-4 p-4 rounded-xl bg-gray-extra-dark",
              "border border-gray-dark shadow-md",
              // duration-300 is a literal class, not derived from
              // CLOSE_ANIMATION_MS - Tailwind's scanner can't see through a
              // template-literal interpolation, so an arbitrary
              // duration-[${...}ms] would silently never generate. Keep
              // these two in sync by hand if either changes.
              "transition-[transform,opacity] duration-300 ease-in-out",
              visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
            )}
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
            <div id={titleId} className="text-xl font-light text-center mt-0 mb-3">{title}</div>
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
