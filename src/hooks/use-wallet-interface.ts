import { useContext } from "react";
import { WalletConnectContext, walletConnectWallet } from "@/wallet";

export const useWalletInterface = () => {
  const walletConnectCtx = useContext(WalletConnectContext);
  if (walletConnectCtx.accountId) {
    return {
      accountId: walletConnectCtx.accountId,
      walletInterface: walletConnectWallet,
    };
  } else {
    return {
      accountId: null,
      walletInterface: null,
    };
  }
};
