"use client";

import { useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { jost } from "@/styles/fonts";
// global-error replaces the entire root layout when it fires (the root
// layout itself threw), so it can't rely on that layout's own globals.css
// import having run first - imported directly here so the dark theme is
// guaranteed to apply even in that doomsday case. Deliberately no shared
// app components (DolButton, etc.) - this is the last line of defense, so
// it stays maximally self-contained rather than risk pulling in whatever
// might have broken.
import "@/styles/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged, not shown - error.message can leak internal details
    // (stack traces, API responses) to whoever's looking at the page.
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        className={twMerge(
          jost.className,
          "antialiased text-dol-light bg-dol-dark tracking",
          "flex flex-col min-h-screen items-center justify-center"
        )}
      >
        <div className="flex flex-col gap-4 items-center">
          <div className="text-xl">Something went globally wrong!</div>
          <button
            type="button"
            onClick={reset}
            className={twMerge(
              "px-4 py-2 rounded-full uppercase text-xs tracking-wider",
              "bg-dol-blue/50 hover:bg-dol-blue/75 duration-500 transition"
            )}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
