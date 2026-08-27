"use client";

import EventEmitter from "events";
import { useCallback, useContext, useEffect } from "react";
import {
  AccountId,
  LedgerId,
  TokenAssociateTransaction,
  TokenId,
  Transaction,
} from "@hashgraph/sdk";
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId,
} from "@hashgraph/hedera-wallet-connect";
import type { ActionContext } from "@erikmuir/dol-lib/types";
import { sleep } from "@erikmuir/dol-lib/utils";
import { fetchJson } from "@/utils";
import { WalletConnectContext } from "./context";
import { PurchaseNftItem, WalletInterface } from "./wallet-interface";

// Created refreshEvent because `dappConnector.walletConnectClient.on(eventName, syncWithWalletConnectContext)` would not call syncWithWalletConnectContext
// Reference usage from walletconnect implementation https://github.com/hashgraph/hedera-wallet-connect/blob/main/src/lib/dapp/index.ts#L120C1-L124C9
const refreshEvent = new EventEmitter();

const name = "Duke of Lizards";
const description = "A Phish-themed Web3 dApp built on Hedera";
const url = `${process.env.NEXT_PUBLIC_APP_URL}`;
const icons = [`${url}/logo.png`];
const network = `${process.env.NEXT_PUBLIC_NETWORK}`;
const projectId = `${process.env.NEXT_PUBLIC_PROJECT_ID}`;
const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;

const dappConnector = new DAppConnector(
  { name, description, url, icons },
  LedgerId.fromString(network),
  projectId,
  Object.values(HederaJsonRpcMethod),
  [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
  [network === "mainnet" ? HederaChainId.Mainnet : HederaChainId.Testnet]
);

// ensure walletconnect is initialized only once
let walletConnectInitPromise: Promise<void> | undefined;
const initializeWalletConnect = async () => {
  if (walletConnectInitPromise === undefined) {
    walletConnectInitPromise = dappConnector.init();
  }
  try {
    await walletConnectInitPromise;
  } catch (err) {
    // Bug found 2026-08-27 investigating a live "Connect Wallet does
    // nothing" report: without this, a rejected init() (e.g. a transient
    // relay hiccup) got cached here forever - every later connect attempt
    // just replayed the same stale rejection instead of ever retrying.
    // Clearing it lets the next click genuinely try again.
    walletConnectInitPromise = undefined;
    throw err;
  }
};

// Long enough that a real, working connect attempt is never cut off early
// (QR render, wallet listing fetch, relay handshake all normally finish in
// a couple seconds); short enough that a genuinely hung attempt (e.g. the
// relay unreachable) surfaces as a real error instead of leaving the pill
// silently unresponsive forever - the other half of the same investigation
// above.
const CONNECT_TIMEOUT_MS = 20_000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Wallet connect timed out")), ms);
    }),
  ]);

export const openWalletConnectModal = async () => {
  await withTimeout(initializeWalletConnect(), CONNECT_TIMEOUT_MS);
  await withTimeout(
    dappConnector.openModal().then(() => {
      refreshEvent.emit("sync");
    }),
    CONNECT_TIMEOUT_MS
  );
};

// Fire-and-forget, same as auditClient - dol-lib's acceptTerms is
// idempotent per version, so a redundant call here (e.g. a second Agree
// click racing the first) is a safe no-op server-side, not something this
// needs to guard against client-side.
export const acceptTermsClient = async (accountId: string) => {
  await fetchJson(`/api/account/${accountId}/accept-terms`, {
    method: "POST",
  });
};

export const auditClient = async (
  action: "NFT_PURCHASE" | "TOKEN_ASSOCIATE",
  success: boolean,
  accountId: AccountId,
  context: ActionContext = {}
) => {
  await fetchJson(`/api/audit/${accountId.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      success,
      accountId: accountId.toString(),
      context,
    }),
  });
};

class WalletConnectWallet implements WalletInterface {
  private getSigner() {
    if (dappConnector.signers.length === 0) {
      throw new Error("No signers found!");
    }
    return dappConnector.signers[0];
  }

  private getAccountId() {
    // Need to convert from walletconnect's AccountId to hashgraph/sdk's AccountId because they are not the same!
    return AccountId.fromString(this.getSigner().getAccountId().toString());
  }

  async associateToken(tokenId: TokenId | string = hfbCollectionId) {
    const associateTokenTransaction = new TokenAssociateTransaction()
      .setAccountId(this.getAccountId())
      .setTokenIds([tokenId]);
    const signer = this.getSigner();
    await associateTokenTransaction.freezeWithSigner(signer);
    const txResult = await associateTokenTransaction.executeWithSigner(signer);
    const txReceipt = await txResult.getReceiptWithSigner(signer);
    const success = txReceipt?.status.toString() === "SUCCESS";
    await auditClient("TOKEN_ASSOCIATE", success, this.getAccountId(), {
      tokenId: tokenId.toString(),
      transactionId: txResult.transactionId.toString(),
    });
    return success;
  }

  // AC/DC Bag checkout - one TransferTransaction covering every item in
  // the bag at once. The sign/execute/receipt call itself doesn't care how
  // many transfer legs are in tx - the real work is the audit log, which
  // needs one NFT_PURCHASE entry per item rather than a single
  // tokenId/serial/showDate/position (replaced the old single-item
  // purchaseNft, CART.md).
  async purchaseNfts(
    tx: Transaction,
    items: PurchaseNftItem[]
  ): Promise<boolean> {
    let success = false;
    let transactionId: string | undefined;
    try {
      const signer = this.getSigner();
      await sleep(1000); // is this needed?
      const signedTx = await tx.signWithSigner(signer);
      const txResult = await signedTx.executeWithSigner(signer);
      transactionId = txResult.transactionId.toString();
      const txReceipt = await txResult.getReceiptWithSigner(signer);
      success = txReceipt?.status.toString() === "SUCCESS";
    } catch (err) {
      console.error("Failed transfer transaction:", err);
    } finally {
      const accountId = this.getAccountId();
      // One atomic transaction, so every item shares the same
      // success/transactionId - all-or-nothing, per Hedera's own semantics.
      await Promise.all(
        items.map((item) =>
          auditClient("NFT_PURCHASE", success, accountId, {
            tokenId: item.nftId.tokenId.toString(),
            serial: item.nftId.serial.toNumber(),
            showDate: item.showDate,
            position: item.position,
            transactionId,
          })
        )
      );
    }
    return success;
  }

  async disconnect() {
    dappConnector.disconnectAll().then(() => {
      refreshEvent.emit("sync");
    });
  }
}

export const walletConnectWallet = new WalletConnectWallet();

// this component will sync the walletconnect state with the context
export const WalletConnectClient = () => {
  // use the HashpackContext to keep track of the hashpack account and connection
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

  // sync the walletconnect state with the context
  const syncWithWalletConnectContext = useCallback(() => {
    const accountId = dappConnector.signers[0]?.getAccountId()?.toString();
    if (accountId) {
      setAccountId(accountId);
      setIsConnected(true);
    } else {
      setAccountId("");
      setIsConnected(false);
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    // Sync after walletconnect finishes initializing
    refreshEvent.addListener("sync", syncWithWalletConnectContext);

    initializeWalletConnect().then(() => {
      syncWithWalletConnectContext();
    });

    return () => {
      refreshEvent.removeListener("sync", syncWithWalletConnectContext);
    };
  }, [syncWithWalletConnectContext]);

  return null;
};
