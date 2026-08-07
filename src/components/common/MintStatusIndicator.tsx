"use client";

import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { usePerformance } from "@/hooks";
import { AnimatedDonut } from "./AnimatedDonut";

export enum MintStatusIndicatorType {
  Emoji = "Emoji",
  Label = "Label",
  EmojiAndLabel = "EmojiAndLabel",
  LabelAndEmoji = "LabelAndEmoji",
}

export type MintStatusIndicatorProps = {
  date: string;
  position: number;
  performance?: DolPerformance;
  type?: MintStatusIndicatorType;
  className?: string;
};

export const MintStatusIndicator = ({
  date,
  position,
  performance: providedPerformance,
  type = MintStatusIndicatorType.EmojiAndLabel,
  className,
}: MintStatusIndicatorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [textColor, setTextColor] = useState<string>("text-gray-medium");
  const [label, setLabel] = useState<string>("Loading");
  const [emoji, setEmoji] = useState<React.ReactNode>(<AnimatedDonut sizeInPixels={16} />);
  const { performance: fetchedPerformance, performanceLoading } = usePerformance(date, shouldFetch ? position : undefined);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || shouldFetch || providedPerformance) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldFetch(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        // Start fetching when within 200px of the viewport
        rootMargin: "200px 0px",
        threshold: 0,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [providedPerformance, shouldFetch]);

  useEffect(() => {
    const coalescedPerformance = { ...providedPerformance, ...fetchedPerformance };
    const notFound = Boolean(!coalescedPerformance);
    const isMinted = Boolean(coalescedPerformance?.serial);
    const isLocked = Boolean(coalescedPerformance?.lockedBy);
    const newTextColor = performanceLoading || notFound ? "text-gray-medium"
      : isMinted ? "text-dol-red"
      : isLocked ? "text-dol-yellow"
      : "text-dol-green";
    const newLabel = performanceLoading ? "Loading"
      : notFound ? "Unknown"
      : isMinted ? "Claimed"
      : isLocked ? "Locked"
      : "Available";
    const newEmoji = performanceLoading ? <AnimatedDonut sizeInPixels={16} />
      : notFound ? "❓"
      : isMinted ? "🔴"
      : isLocked ? "🟡"
      : "🟢";
    setTextColor(newTextColor);
    setLabel(newLabel);
    setEmoji(newEmoji);
  }, [providedPerformance, fetchedPerformance, performanceLoading]);

  const title = type === MintStatusIndicatorType.Emoji ? label : "";

  const emojiSpan = <span key={`emoji-${date}-${position}`} title={title}>{emoji}</span>;
  const labelSpan = <span key={`label-${date}-${position}`} className={textColor}>{label}</span>;

  const spans: React.ReactNode[] = [];

  switch (type) {
    case MintStatusIndicatorType.Emoji:
      spans.push(emojiSpan);
      break;
    case MintStatusIndicatorType.Label:
      spans.push(labelSpan);
      break;
    case MintStatusIndicatorType.EmojiAndLabel:
      spans.push(emojiSpan, labelSpan);
      break;
    case MintStatusIndicatorType.LabelAndEmoji:
      spans.push(labelSpan, emojiSpan);
      break;
  }

  className = twMerge("flex items-center gap-1", "text-xs uppercase tracking-widest", className);

  return <div ref={containerRef} className={className}>{spans}</div>;
};
