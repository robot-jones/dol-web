"use client";

import { Breadcrumbs } from "@/components/views/HelpingFriendlyBook/Locations/Breadcrumbs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function HelpingFriendlyBookLocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCountry = searchParams.get("country") || undefined;
  const currentState = searchParams.get("state") || undefined;
  const currentCity = searchParams.get("city") || undefined;
  const currentVenue = searchParams.get("venue") || undefined;

  const jumpTo = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      switch (name) {
        case "country":
          params.delete("venue");
          params.delete("city");
          params.delete("state");
          break;
        case "state":
          params.delete("venue");
          params.delete("city");
          break;
        case "city":
          params.delete("venue");
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
        country={currentCountry}
        state={currentState}
        city={currentCity}
        venue={currentVenue}
        jumpTo={jumpTo}
      />
      {children}
    </>
  );
}
