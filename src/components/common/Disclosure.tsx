import { twMerge } from "tailwind-merge";

export type DisclosureProps = {
  summary: string;
  children: React.ReactNode;
  className?: string;
  // "default" is a page-section boundary (e.g. "Details") - big, uppercase,
  // its own colored box, meant to be noticed. "subtle" is a skippable aside
  // (e.g. explainer copy a repeat visitor already knows) - small muted
  // text, no box, meant to get out of the way of whatever's actually above
  // it on the page.
  variant?: "default" | "subtle";
};

// Native <details>/<summary> - gets keyboard/screen-reader toggle semantics
// for free, no open/closed state to manage ourselves. group-open: handles
// the chevron; Tailwind's own `open:` variant targets <details> directly,
// but the chevron is a descendant so it needs `group` on <details> instead.
export const Disclosure = ({
  summary,
  children,
  className,
  variant = "default",
}: DisclosureProps): React.ReactNode => {
  return (
    <details
      className={twMerge("group w-full", variant === "default" && "pt-16", className)}
    >
      {variant === "subtle" ? (
        <summary className="flex items-center justify-center gap-1.5 py-1 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden text-xs text-gray-medium hover:text-gray-light">
          <span>{summary}</span>
          <svg
            className="w-3 h-3 transition-transform duration-300 group-open:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
      ) : (
        // The visible pill is the *only* clickable surface - its own p-4
        // fully defines the hit target. Spacing above/below it (pt-16 on
        // <details>, pb-4 below via the children wrapper) lives outside
        // the <summary>, not as its padding, so there's no invisible
        // clickable margin the pill itself doesn't cover (Erik caught this
        // drifting once already - keep the two in lockstep).
        <summary className="flex flex-wrap justify-center gap-2 items-center cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-row items-center justify-center gap-2 w-full p-4 rounded-lg bg-gray-dark/50 hover:bg-gray-dark/75 duration-500 transition ease-in-out">
            <div className="text-2xl uppercase tracking-widest">{summary}</div>
            <svg
              className="w-4 h-4 transition-transform duration-300 group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
      )}
      {variant === "default" ? <div className="pt-4">{children}</div> : children}
    </details>
  );
};
