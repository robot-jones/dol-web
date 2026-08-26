import { openWalletConnectModal } from "@/wallet";
import { DolButton } from "@/components/common/DolButton";

export const NotConnected = (): React.ReactNode => (
  <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-420px)] gap-4 py-8">
    <h1 className="text-[60px] text-center">Build Your Collection</h1>
    <div className="text-xl text-balance text-center">
      Here you&apos;ll find all the pages of the Helping Friendly Book for
      which you&apos;ve laid claim.
    </div>
    <div>&nbsp;</div>
    <DolButton color="blue" roundedFull onClick={openWalletConnectModal}>Connect your wallet</DolButton>
  </div>
);
