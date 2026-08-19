"use client";

import { Breadcrumbs } from "@/components/views/HelpingFriendlyBook/Dates/Breadcrumbs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function HelpingFriendlyBookDatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentEra = searchParams.get("era") || undefined;
  const currentYear = searchParams.get("year") || undefined;
  const currentMonth = searchParams.get("month") || undefined;

  const jumpTo = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      switch (name) {
        case "era":
          params.delete("month");
          params.delete("year");
          break;
        case "year":
          params.delete("month");
          break;
      }
      params.set(name, value);
      router.push(pathname + "?" + params.toString());
    },
    [searchParams, pathname, router]
  );

  return (
    <>
      <Breadcrumbs
        era={currentEra}
        year={currentYear}
        month={currentMonth}
        jumpTo={jumpTo}
      />
      {children}
    </>
  );
}
