import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import { twMerge } from "tailwind-merge";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";

export type PerformanceAudioPlayerProps = {
  src?: string;
  loading?: boolean;
  className?: string;
};

// Minimal play/pause for the performance's mp3, overlaid on the NFT image
// (top-left corner, positioned by the parent via `className`) instead of
// buried in the Details disclosure. No autoplay, no loop, unmuted - just a
// toggle, so there's no browser autoplay-policy handling to carry. The full
// native <audio controls> widget still lives in Fixed NFT Attributes/MP3
// (FixedAttributes.tsx) - deliberately not duplicated here, so there's only
// ever one playable copy of the audio on the page.
//
// Dark/blurred circle rather than the app's usual dol-blue styling - this
// sits on top of arbitrary image content (bgColor/donut/subject all vary
// per performance), so it needs to read against anything, not match one
// particular theme color.
const badgeClassName = twMerge(
  "flex items-center justify-center w-[72px] h-[72px] rounded-full",
  "bg-dol-dark/60 backdrop-blur-sm border border-dol-light/20 shadow-md"
);

export const PerformanceAudioPlayer = ({
  src,
  loading,
  className,
}: PerformanceAudioPlayerProps): React.ReactNode => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Covers navigating to a different performance (prev/next song) while
  // this component stays mounted under the same route shell - without
  // this the button could keep showing "playing" for audio that's gone.
  useEffect(() => {
    setIsPlaying(false);
  }, [src]);

  if (loading) {
    return (
      <div className={twMerge(badgeClassName, className)}>
        <AnimatedDonut sizeInPixels={32} color="light" />
      </div>
    );
  }

  if (!src) {
    return null;
  }

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        aria-pressed={isPlaying}
        className={twMerge(
          badgeClassName,
          "text-dol-light hover:brightness-125 transition duration-300 ease-in-out",
          className
        )}
      >
        {isPlaying
          ? <FaPause size={26} />
          : <FaPlay size={26} className="ml-1" />}
      </button>
      {/* preload="none": most visitors never hit play, so don't fetch the
          mp3 until they ask for it. */}
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </>
  );
};
