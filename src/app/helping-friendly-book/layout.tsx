"use client";

import { FilterTypePicker } from "@/components/views/HelpingFriendlyBook/FilterTypePicker";

export default function HelpingFriendlyBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-[320px] md:w-[500px] lg:w-[680px] xl:w-[900px] flex flex-col items-center gap-4 mt-8">
      <div className="fixed top-[var(--header-height)] -translate-y-1/2 z-20 w-full">
        <FilterTypePicker />
      </div>
      {children}
    </div>
  );
}
