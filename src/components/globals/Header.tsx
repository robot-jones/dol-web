"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { DiscordLink } from "../common/DiscordLink";
import { GoBack } from "../common/GoBack";
import { Shapes } from "../common/Shapes";
import { Nav } from "./Nav";
import { Wallet } from "./Wallet";

export const Header = () => {
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // No history entry to go back to; send user to a safe default
      router.push("/");
    }
  }, [router]);

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
      <div className="flex flex-wrap items-center justify-between p-2">
        <div
          className="flex items-center gap-2 cursor-default"
          title="Can you still have fun?"
        >
          <a href="https://wilson.com">
            <Shapes sizeInPixels={20} bounceOnHover />
          </a>
          <GoBack handleClick={handleBack} />
        </div>
        <div className="pr-2 flex items-center gap-2">
          <DiscordLink sizeInPixels={24} />
          <Wallet />
        </div>
      </div>
      <div className="px-2 pt-2 pb-8"><Nav /></div>
    </header>
  );
};
