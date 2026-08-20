"use client";

import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { getTwDolColor, TwColorClassPrefix } from "@/utils";
import { usePerformance, useMintStatus } from "@/hooks";

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

const getTextColorClass = (color: ReturnType<typeof useMintStatus>["color"]): string =>
  color === "gray" ? "text-gray-medium" : getTwDolColor(color, TwColorClassPrefix.Text);

export const MintStatusIndicator = ({
  date,
  position,
  performance: providedPerformance,
  type = MintStatusIndicatorType.EmojiAndLabel,
  className,
}: MintStatusIndicatorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
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

  const performance = providedPerformance ?? fetchedPerformance;
  const { label, color, emoji } = useMintStatus(performance, performanceLoading);
  const textColor = getTextColorClass(color);

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
