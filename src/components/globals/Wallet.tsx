import { useCallback, useEffect, useRef, useState } from "react";
import { useIsTokenAssociated, useWalletInterface } from "@/hooks";
import { acceptTermsClient, openWalletConnectModal } from "@/wallet";
import { DolButton } from "../common/DolButton";
import Modal from "./Modal";

export const Wallet = () => {
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;
  const [open, setOpen] = useState(false);
  const [associateError, setAssociateError] = useState(false);
  // Whether the connect-confirmation step (checkbox + Agree) is showing, in
  // place of the normal menu. Scoped to the Connect Wallet action itself,
  // not the whole menu - Disconnect/Associate Token stay reachable without
  // re-agreeing to anything.
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const { accountId, walletInterface } = useWalletInterface();
  const { isAssociated, mutateIsAssociated } = useIsTokenAssociated(hfbCollectionId, accountId);

  // Set only by handleAgreeClick, immediately before opening the wallet
  // connector - accountId isn't known yet at that point (connecting is
  // async), so this flags "the persistence write below is expected" once it
  // shows up. Never set just because accountId happens to be present -
  // e.g. a wallet silently reconnecting from a prior session shouldn't
  // trigger a write here, since this session never saw them agree to
  // anything.
  const pendingAcceptance = useRef(false);

  useEffect(() => {
    if (accountId && pendingAcceptance.current) {
      pendingAcceptance.current = false;
      acceptTermsClient(accountId).catch(() => {
        // Best-effort - dol-lib's acceptTerms is idempotent, so this is
        // safe to just retry naturally on their next connect if it fails.
      });
    }
  }, [accountId]);

  const handleAccountClick = async () => {
    setAssociateError(false);
    setOpen(!open);
  };

  const handleConnectClick = useCallback(() => {
    setConsentChecked(false);
    setShowConsent(true);
  }, []);

  const handleAgreeClick = useCallback(() => {
    pendingAcceptance.current = true;
    openWalletConnectModal();
    setShowConsent(false);
    setOpen(false);
  }, []);

  const handleConsentCancelClick = useCallback(() => {
    setShowConsent(false);
  }, []);

  const handleDisconnectClick = useCallback(async () => {
    await walletInterface?.disconnect();
    setOpen(false);
  }, [walletInterface]);

  const handleAssociateClick = useCallback(async () => {
    setAssociateError(false);
    try {
      const success = await walletInterface?.associateToken(hfbCollectionId);
      if (success) {
        mutateIsAssociated(true);
        setOpen(false);
      } else {
        // Stay open on failure - closing here would hide the error in the
        // same tick it appears, same bug this is fixing.
        setAssociateError(true);
      }
    } catch {
      setAssociateError(true);
    }
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
          {showConsent ? (
            <>
              <label className="flex items-start gap-2 text-xs text-gray-medium leading-snug cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  aria-label="Agree to the Terms of Service and Privacy Policy, and confirm minimum age"
                />
                <span>
                  By connecting your wallet, you confirm you&apos;re at least
                  18 (or the age of majority where you live) and agree to the{" "}
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dol-blue underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dol-blue underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              <DolButton
                color="green"
                fullWidth
                disabled={!consentChecked}
                onClick={handleAgreeClick}
              >
                Agree &amp; Connect
              </DolButton>
              <DolButton color="gray" fullWidth outline onClick={handleConsentCancelClick}>Back</DolButton>
            </>
          ) : (
            <>
              {accountId ? (
                <DolButton color="red" fullWidth onClick={handleDisconnectClick}>Disconnect</DolButton>
              ) : (
                <DolButton color="green" fullWidth onClick={handleConnectClick}>Connect Wallet</DolButton>
              )}
              {accountId && !isAssociated && (
                <>
                  <DolButton color="green" fullWidth onClick={handleAssociateClick}>Associate Token</DolButton>
                  {associateError && (
                    <div className="text-xs text-dol-red text-center">
                      Failed to associate token. Please try again.
                    </div>
                  )}
                </>
              )}
              <DolButton color="blue" fullWidth href="/terms-of-service" onClick={handleLinkClick}>Terms of Service</DolButton>
              <DolButton color="yellow" fullWidth href="/privacy-policy" onClick={handleLinkClick}>Privacy Policy</DolButton>
              <DolButton color="gray" fullWidth outline onClick={handleCancelClick}>Cancel</DolButton>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
