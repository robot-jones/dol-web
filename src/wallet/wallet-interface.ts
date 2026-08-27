import { NftId, TokenId, TransferTransaction } from "@hashgraph/sdk";

// One entry per item in a checkout's TransferTransaction - purchaseNfts
// needs all three to write one NFT_PURCHASE audit log per item, since the
// transaction itself only carries token/serial, not showDate/position.
export type PurchaseNftItem = {
  nftId: NftId;
  showDate: string;
  position: number;
};

export interface WalletInterface {
  associateToken: (tokenId: TokenId | string) => Promise<boolean>;
  // AC/DC Bag checkout (CART.md): signs+executes one TransferTransaction
  // covering every item at once, then audit-logs each item individually.
  // Will replace purchaseNft outright once Performance.tsx's rewrite
  // removes its only remaining caller - see CART.md's hard-cutover work.
  purchaseNfts: (
    transaction: TransferTransaction,
    items: PurchaseNftItem[]
  ) => Promise<boolean>;
  /** @deprecated use purchaseNfts - kept only until Performance.tsx's single-item flow is retired (CART.md) */
  purchaseNft: (
    transaction: TransferTransaction,
    nftId: NftId,
    showDate: string,
    position: number
  ) => Promise<boolean>;
  disconnect: () => Promise<void>;
}
