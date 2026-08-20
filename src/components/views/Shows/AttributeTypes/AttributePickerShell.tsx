"use client";

import { useEffect, useRef, useState } from "react";
import ClickAwayListener from "react-click-away-listener";
import { MdExpandMore } from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { DolColor } from "@erikmuir/dol-lib/types";
import { getLabelTextColorClass } from "@erikmuir/dol-lib/dapp";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";

export type PickerOption<T extends string | undefined> = {
  label: string;
  value?: T;
};

export type AttributePickerShellProps<T extends string | undefined> = {
  id: string;
  label?: string;
  options: PickerOption<T>[];
  currentValue?: T;
  onChange: (value?: T) => void;
  disabled?: boolean;
  attributeColor?: DolColor;
  optionRowClassName?: string;
  // isActive is the keyboard-or-mouse-highlighted row - onMouseEnter below
  // feeds the same activeIndex Arrow Up/Down uses, so hover and keyboard
  // nav are one state, not two. isSelected is the current value; both can
  // be true on the same row at once (you arrow onto what's already picked).
  renderOption: (option: PickerOption<T>, isSelected: boolean, isActive: boolean) => React.ReactNode;
};

// Custom, fully-styled replacement for DropDownAttribute's native <select> -
// see PUNCHLIST.md Phase 9. Real trade-off, called out there too: keyboard
// nav/ARIA are hand-built now, not free from the browser. Minimal listbox
// pattern (Escape/click-away close, Arrow Up/Down move, Enter/Space select),
// same "real but not maximal" scope as Modal.tsx's own ARIA work - a roving
// aria-activedescendant, not a full roving-tabindex implementation.
export const AttributePickerShell = <T extends string | undefined>({
  id,
  label,
  options,
  currentValue,
  onChange,
  disabled,
  attributeColor,
  optionRowClassName,
  renderOption,
}: AttributePickerShellProps<T>): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === currentValue))
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = `${id}-listbox`;
  const activeOptionId = `${id}-option-${activeIndex}`;

  // Guards against a real bug, not a hypothetical one: opening a tall
  // popover can trigger the browser's own scroll-into-view, which can
  // leave an entirely stationary cursor geometrically over a different
  // row than the one the user actually last touched - firing a genuine
  // mouseenter with no real mouse movement behind it. Confirmed directly
  // (logged activeIndex jumping to the last option immediately on open,
  // before any keypress or real mouse move).
  //
  // Fix is time-based, not movement-based: tried gating on a real
  // mousemove first, but mouseenter can fire before or in the same tick
  // as the first mousemove for a genuine hover too, so that approach
  // swallowed real first-hovers along with the phantom one. A short
  // window (a browser mouseenter within it is essentially always the
  // popover-opened-under-the-cursor case, not a deliberate move - even a
  // fast intentional hover takes noticeably longer) tells them apart
  // without that false negative.
  const openedAtRef = useRef(0);
  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeOptionId]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const selectIndex = (index: number) => {
    onChange(options[index]?.value);
    close();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectIndex(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  const currentLabel = options.find((o) => o.value === currentValue)?.label ?? "";

  return (
    <div className="relative w-fit min-w-[140px]">
      {label && (
        <label
          htmlFor={id}
          className={twMerge("block text-[10px] uppercase pb-1", getLabelTextColorClass(attributeColor))}
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={twMerge(
          "flex items-center justify-between gap-2 w-full",
          "border rounded p-4 pr-2 text-sm font-mono",
          "bg-dol-dark text-dol-light",
          attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Background, 25) : "bg-gray-medium/25",
          attributeColor ? getTwDolColor(attributeColor, TwColorClassPrefix.Border) : "border-gray-medium",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span>{currentLabel}</span>
        <MdExpandMore className={twMerge("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ClickAwayListener onClickAway={() => close(false)}>
          <ul
            id={listboxId}
            role="listbox"
            aria-activedescendant={activeOptionId}
            aria-labelledby={label ? id : undefined}
            tabIndex={-1}
            ref={(el) => el?.focus()}
            onKeyDown={handleListboxKeyDown}
            className={twMerge(
              "absolute z-[5] left-1/2 -translate-x-1/2 mt-1",
              "w-max min-w-full max-w-[calc(100vw-2rem)] sm:max-w-[360px] max-h-[420px] overflow-y-auto",
              "rounded border border-gray-dark-2 bg-dol-dark shadow-lg",
            )}
          >
            {options.map((option, index) => (
              <li
                key={`${option.label}-${option.value}`}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === currentValue}
                onMouseEnter={() => {
                  if (Date.now() - openedAtRef.current > 150) setActiveIndex(index);
                }}
                onClick={() => selectIndex(index)}
                className={twMerge("cursor-pointer", optionRowClassName)}
              >
                {renderOption(option, option.value === currentValue, index === activeIndex)}
              </li>
            ))}
          </ul>
        </ClickAwayListener>
      )}
    </div>
  );
};
