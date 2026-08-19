import { useCallback, useState } from "react";
import { useIsTokenAssociated, useWalletInterface } from "@/hooks";
import { openWalletConnectModal } from "@/wallet";
import { DolButton } from "../common/DolButton";
import Modal from "./Modal";

export const Wallet = () => {
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;
  const [open, setOpen] = useState(false);
  const { accountId, walletInterface } = useWalletInterface();
  const { isAssociated, mutateIsAssociated } = useIsTokenAssociated(hfbCollectionId, accountId);

  const handleAccountClick = async () => {
    setOpen(!open);
  };

  const handleConnectClick = useCallback(async () => {
    openWalletConnectModal();
    setOpen(false);
  }, []);

  const handleDisconnectClick = useCallback(async () => {
    await walletInterface?.disconnect();
    setOpen(false);
  }, [walletInterface]);

  const handleAssociateClick = useCallback(async () => {
    const success = await walletInterface?.associateToken(hfbCollectionId);
    if (success) {
      mutateIsAssociated(true);
    }
    setOpen(false);
  }, [walletInterface, mutateIsAssociated, hfbCollectionId]);

  const handleLinkClick = useCallback(() => {
    setOpen(false);
  }, []);

  const handleCancelClick = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <div>
      <DolButton color="gray" size="sm" roundedFull onClick={handleAccountClick}>
        {accountId || "Account"}
      </DolButton>
      <Modal
        id="wallet"
        show={open}
        onClose={handleCancelClick}
        ariaLabel="Wallet menu"
        className="justify-end items-start pt-10"
      >
        <div className="flex flex-col gap-3 w-48">
          {accountId ? (
            <DolButton color="red" fullWidth onClick={handleDisconnectClick}>Disconnect</DolButton>
          ) : (
            <DolButton color="green" fullWidth onClick={handleConnectClick}>Connect Wallet</DolButton>
          )}
          {accountId && !isAssociated && (
            <DolButton color="green" fullWidth onClick={handleAssociateClick}>Associate Token</DolButton>
          )}
          <DolButton color="blue" fullWidth href="/terms-of-service" onClick={handleLinkClick}>Terms of Service</DolButton>
          <DolButton color="yellow" fullWidth href="/privacy-policy" onClick={handleLinkClick}>Privacy Policy</DolButton>
          <DolButton color="gray" fullWidth outline onClick={handleCancelClick}>Cancel</DolButton>
        </div>
      </Modal>
    </div>
  );
};
