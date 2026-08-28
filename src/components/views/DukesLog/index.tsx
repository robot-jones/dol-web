import { useWalletInterface } from "@/hooks/use-wallet-interface";
import { openWalletConnectModal } from "@/wallet";
import { LogSection } from "./LogSection";
import { DolButton } from "@/components/common/DolButton";

export default function DukesLog(): React.ReactElement {
  const { accountId } = useWalletInterface();

  const handleConnectClick = async () => {
    openWalletConnectModal();
  };

  const ConnectWalletButton = (): React.ReactNode => (
    <div className="text-center">
      <DolButton
        color="dark"
        size="lg"
        roundedFull
        onClick={handleConnectClick}
        className="text-dol-yellow hover:bg-gray-extra-dark transition ease-in-out"
      >
        Connect your wallet
      </DolButton>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="text-4xl uppercase tracking-[4px] text-center my-8">
        Audit Logs
      </div>
      <div className="flex flex-col items-center gap-8">
        {accountId ? (
          <LogSection title="Your Actions" logKey={accountId} />
        ) : (
          <ConnectWalletButton />
        )}
        <LogSection title="Duke's Actions" logKey={`${process.env.NEXT_PUBLIC_TREASURY_ACCOUNT}`} />
      </div>
    </div>
  );
}
