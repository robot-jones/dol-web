"use client";

import { useEffect } from "react";
import { DolButton } from "@/components/common/DolButton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 items-center mt-16">
      <div className="text-xl">Something went wrong!</div>
      <DolButton color="blue" roundedFull onClick={reset}>Try again</DolButton>
    </div>
  );
}
