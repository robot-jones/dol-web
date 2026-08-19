"use client";

import { FilterTypePicker } from "@/components/views/HelpingFriendlyBook/FilterTypePicker";

export default function HelpingFriendlyBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] xl:max-w-[900px] flex flex-col items-center gap-4 mt-8">
      <div className="fixed top-[var(--header-height)] -translate-y-1/2 z-20 w-full">
        <FilterTypePicker />
      </div>
      {children}
    </div>
  );
}
