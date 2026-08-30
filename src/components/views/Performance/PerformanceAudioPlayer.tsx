import { useEffect, useId, useState } from "react";
import { FaMusic } from "react-icons/fa";
import { twMerge } from "tailwind-merge";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";

export type PerformanceAudioPlayerProps = {
  src?: string;
  showDate?: string;
  loading?: boolean;
  className?: string;
};

// A musical-note badge that toggles a control drawer (native
// <audio controls>: play/pause, seek, volume), overlaid across the top of
// the NFT image (inset by a gap on each side, positioned by the parent via
// `className`) instead of buried in the Details disclosure. The badge only
// opens/closes the drawer - it never starts playback itself.
//
// Always renders, even when there's no mp3 - some performances never had a
// recording made, and recent ones just haven't had their audio processed
// and uploaded to phish.in yet. When `src` is missing, the drawer shows an
// explanatory message instead of controls (see UNAVAILABLE_MESSAGE_MAX_AGE_MS
// below for how we distinguish the two cases).
//
// The <audio> element stays mounted (just visually collapsed) rather than
// unmounting on close, so closing the drawer doesn't stop a track that's
// already playing.
//
// The native controls styling is borrowed from AudioAttribute.tsx, which
// used to be Fixed NFT Attributes/MP3's playable copy - that's now just a
// link (see FixedAttributes.tsx), so this drawer is the only playable
// copy on the page again, just reskinned as a slide-out instead of a
// plain inline widget.
//
// Dark/blurred pill rather than the app's usual dol-blue styling - this
// sits on top of arbitrary image content (bgColor/donut/subject all vary
// per performance), so it needs to read against anything, not match one
// particular theme color.
const controlHeightClassName = "h-12";

// There's no "audio processed/uploaded" signal anywhere in our data (phish.in
// doesn't surface one at the track level, and we don't store one ourselves) -
// so recency is a heuristic based on the show date itself. A year is a
// generous window for phish.in to catch up; past that we stop implying the
// audio is still coming.
const UNAVAILABLE_MESSAGE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const getUnavailableMessage = (showDate?: string): string => {
  const showTime = showDate ? new Date(showDate).getTime() : NaN;
  const isRecent =
    !Number.isNaN(showTime) && Date.now() - showTime <= UNAVAILABLE_MESSAGE_MAX_AGE_MS;
  return isRecent
    ? "Audio hasn't been uploaded yet — check back soon."
    : "No mp3 recording exists for this performance.";
};

const badgeClassName = twMerge(
  "flex items-center justify-center w-12 rounded-full shrink-0",
  controlHeightClassName,
  "bg-dol-dark/60 backdrop-blur-sm border border-dol-light/20 shadow-md"
);

const drawerAudioClassName = twMerge(
  "w-full h-full",
  getTwDolColor("light", TwColorClassPrefix.Text),
  getTwDolColor("dark", TwColorClassPrefix.Background, 50, "[&::-webkit-media-controls-panel]")
);

export const PerformanceAudioPlayer = ({
  src,
  showDate,
  loading,
  className,
}: PerformanceAudioPlayerProps): React.ReactNode => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();

  // Covers navigating to a different performance (prev/next song) while
  // this component stays mounted under the same route shell - without
  // this the drawer could stay open showing controls for audio that's gone.
  useEffect(() => {
    setIsOpen(false);
  }, [src]);

  if (loading) {
    return (
      <div className={twMerge(badgeClassName, className)}>
        <AnimatedDonut sizeInPixels={32} color="light" />
      </div>
    );
  }

  // Width comes from the parent via `className` (e.g. `left-4 right-4`
  // insets), not from us - no negative offsets, no calc().
  return (
    <div className={twMerge("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={drawerId}
        aria-label={isOpen ? "Hide audio controls" : "Show audio controls"}
        className={twMerge(
          badgeClassName,
          "text-dol-light hover:brightness-125 transition duration-300 ease-in-out",
          isOpen ? "bg-dol-dark/75" : "bg-dol-dark/60",
        )}
      >
        <FaMusic size={18} />
      </button>
      {/* basis-0 + transition-[flex-grow]: animates the drawer's width
          without a hardcoded pixel target, since the available space
          depends on the image's responsive width. The pill chrome
          (bg/blur/border/shadow) lives here rather than on a wrapper around
          the audio element - it always fills this div exactly, so a
          separate layer for it would just be a same-sized no-op.
          opacity rides along with the width: at grow-0/basis-0 the border
          still has its own width and renders as a stray hairline next to
          the badge even though there's no content width left to hold it,
          so closed also means invisible, not just empty. */}
      <div
        id={drawerId}
        inert={!isOpen}
        className={twMerge(
          "flex items-center basis-0 overflow-hidden rounded-full bg-dol-dark/60 backdrop-blur-sm border border-dol-light/20 shadow-md transition-[flex-grow,opacity] duration-300 ease-in-out",
          controlHeightClassName,
          isOpen ? "grow opacity-100" : "grow-0 opacity-0"
        )}
      >
        {src ? (
          // preload="none": most visitors never hit play, so don't fetch
          // the mp3 until they ask for it.
          <audio
            src={src}
            controls
            preload="none"
            style={{ colorScheme: "dark" }}
            className={drawerAudioClassName}
          />
        ) : (
          <p
            className={twMerge(
              "w-full h-full flex items-center px-4 text-sm truncate",
              getTwDolColor("light", TwColorClassPrefix.Text)
            )}
            title={getUnavailableMessage(showDate)}
          >
            {getUnavailableMessage(showDate)}
          </p>
        )}
      </div>
    </div>
  );
};
