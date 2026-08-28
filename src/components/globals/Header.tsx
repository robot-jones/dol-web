"use client";

import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { Shapes } from "../common/Shapes";
import { Bag } from "./Bag";
import { Nav } from "./Nav";
import { Wallet } from "./Wallet";

export const Header = () => {
  const headerRef = useRef<HTMLElement>(null);

  // Publishes the header's real rendered height as a CSS var so anything
  // sitting flush against it doesn't need a hardcoded px guess. A
  // ResizeObserver, not a one-time measurement, since height changes
  // dynamically (nav wrapping on narrow viewports).
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    const setHeightVar = () => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${header.offsetHeight}px`
      );
    };
    setHeightVar();
    const observer = new ResizeObserver(setHeightVar);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className={twMerge(
        "fixed top-0 w-full bg-gray-extra-dark",
        "border-b border-gray-dark-2 shadow-lg",
        "z-10",
      )}
    >
      <div className="header-grid items-start gap-x-2 p-2 pb-4">
        <div
          className="[grid-area:logo] flex items-center gap-2 cursor-default"
          title="Can you still have fun?"
        >
          <a href="https://wilson.com" target="_blank" rel="noopener noreferrer">
            <Shapes sizeInPixels={20} bounceOnHover />
          </a>
        </div>
        <div className="[grid-area:nav] px-2 pt-2 pb-8 min-[900px]:py-2"><Nav /></div>
        <div className="[grid-area:actions] pr-2 flex items-center justify-end gap-2">
          <Bag />
          <Wallet />
        </div>
      </div>
    </header>
  );
};
