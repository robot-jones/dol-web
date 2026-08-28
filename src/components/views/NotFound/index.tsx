import Image from "next/image";
import { DolButton } from "@/components/common/DolButton";

export const NotFound = (): React.ReactElement => (
  <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-420px)] gap-4 py-8 px-4">
    <h1 className="text-[60px] text-center">Not in My Book</h1>
    <div className="text-xl text-balance text-center">
      Even I, Wilson, cannot find this page in my collection. The Famous
      Mockingbird must have made off with it before you arrived.
    </div>
    <Image
      src="/subjects/famous-mockingbird.png"
      alt="The Famous Mockingbird"
      width={240}
      height={240}
      priority
    />
    <div>&nbsp;</div>
    <div className="flex items-center justify-center gap-4">
      <DolButton color="blue" roundedFull href="/">Return Home</DolButton>
      <DolButton color="green" roundedFull href="/book/dates">Browse the Book</DolButton>
    </div>
  </div>
);
