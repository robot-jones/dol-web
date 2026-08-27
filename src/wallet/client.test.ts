// wallet/client.ts's first-ever test coverage (CART.md). Scoped to
// WalletConnectWallet's actual payment-adjacent methods - associateToken,
// purchaseNfts, disconnect - not the WalletConnectClient sync component or
// the trivial acceptTermsClient wrapper; the reason to build this harness
// at all was purchaseNfts becoming the app's sole payment path once
// purchaseNft retired, so that's what it's scoped to cover.

const { signers, initMock, disconnectAllMock } = vi.hoisted(() => {
  // client.ts reads this at module top level (LedgerId.fromString(network),
  // passed to the real-but-network-agnostic LedgerId below) - plain
  // textual ordering before the `import "./client"` further down does NOT
  // reliably beat it (Vite hoists imports), unlike the route.ts files
  // this codebase's other tests set env vars for, which read theirs
  // lazily inside an exported function body instead. vi.hoisted runs
  // before any import resolves, which does.
  process.env.NEXT_PUBLIC_NETWORK = "testnet";
  return {
    signers: [] as unknown[],
    initMock: vi.fn(async () => {}),
    disconnectAllMock: vi.fn(async () => {}),
  };
});

// A lightweight fake, not the real WalletConnect relay/modal stack - the
// real DAppConnector touches window.matchMedia at import time (via
// @walletconnect/modal-core), which crashes outright in jsdom (hit this
// exact crash building Bag.test.tsx - see CART.md). `signers` is the same
// array the fake instance exposes, so tests can push/clear fake signers
// directly to simulate a connected/disconnected wallet.
vi.mock("@hashgraph/hedera-wallet-connect", () => ({
  DAppConnector: class {
    signers = signers;
    init = initMock;
    openModal = vi.fn(async () => {});
    disconnectAll = disconnectAllMock;
  },
  HederaJsonRpcMethod: {},
  HederaSessionEvent: { ChainChanged: "chainChanged", AccountsChanged: "accountsChanged" },
  HederaChainId: { Mainnet: "mainnet", Testnet: "testnet" },
}));

const fetchJsonMock = vi.fn();
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

// purchaseNfts/purchaseNft both `await sleep(1000)` before signing - real
// enough to matter live, but no reason to make every test wait a second.
vi.mock("@erikmuir/dol-lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@erikmuir/dol-lib/utils")>()),
  sleep: vi.fn(async () => {}),
}));

// TokenAssociateTransaction is a real @hashgraph/sdk transaction builder -
// its freeze/execute calls expect a real protocol-level Signer, which the
// fake signers above don't implement. Everything else from @hashgraph/sdk
// (AccountId, TokenId, NftId...) stays real via importOriginal - those are
// plain value types with no side effects, safe to exercise unmocked.
const tokenAssociateResult = {
  transactionId: { toString: () => "0.0.1@1700000000.000000001" },
  getReceiptWithSigner: vi.fn(async (): Promise<{ status: { toString: () => string } }> => ({
    status: { toString: () => "SUCCESS" },
  })),
};
const tokenAssociateChainable = {
  setAccountId: vi.fn(function (this: unknown) { return this; }),
  setTokenIds: vi.fn(function (this: unknown) { return this; }),
  freezeWithSigner: vi.fn(async function (this: unknown) { return this; }),
  executeWithSigner: vi.fn(async () => tokenAssociateResult),
};
vi.mock("@hashgraph/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hashgraph/sdk")>()),
  TokenAssociateTransaction: class {
    constructor() {
      return tokenAssociateChainable;
    }
  },
}));

import { NftId, TokenId } from "@hashgraph/sdk";
import { walletConnectWallet } from "./client";

const fakeSigner = (accountId: string) => ({
  getAccountId: () => ({ toString: () => accountId }),
});

// purchaseNfts/purchaseNft take an already-frozen Transaction, not
// something they build themselves - a plain signWithSigner/executeWithSigner
// stub is enough, no need to fake the whole Transaction class.
const makeSignedTx = (receiptStatus = "SUCCESS") => {
  const txResult = {
    transactionId: { toString: () => "0.0.1@1700000000.000000002" },
    getReceiptWithSigner: vi.fn(async () => ({ status: { toString: () => receiptStatus } })),
  };
  const signedTx = { executeWithSigner: vi.fn(async () => txResult) };
  return { signWithSigner: vi.fn(async () => signedTx) };
};

describe("WalletConnectWallet", () => {
  beforeEach(() => {
    signers.length = 0;
    fetchJsonMock.mockReset().mockResolvedValue(undefined);
    tokenAssociateChainable.executeWithSigner.mockClear();
    tokenAssociateResult.getReceiptWithSigner
      .mockClear()
      .mockResolvedValue({ status: { toString: () => "SUCCESS" } });
  });

  describe("associateToken", () => {
    it("returns true and audits success when the receipt status is SUCCESS", async () => {
      signers.push(fakeSigner("0.0.1234"));

      const success = await walletConnectWallet.associateToken("0.0.9999");

      expect(success).toBe(true);
      expect(tokenAssociateChainable.setTokenIds).toHaveBeenCalledWith(["0.0.9999"]);
      expect(fetchJsonMock).toHaveBeenCalledWith(
        "/api/audit/0.0.1234",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"action":"TOKEN_ASSOCIATE"'),
        })
      );
    });

    it("returns false when the receipt status isn't SUCCESS", async () => {
      signers.push(fakeSigner("0.0.1234"));
      tokenAssociateResult.getReceiptWithSigner.mockResolvedValue({
        status: { toString: () => "FAIL" },
      });

      const success = await walletConnectWallet.associateToken("0.0.9999");

      expect(success).toBe(false);
    });

    it("throws when no wallet is connected", async () => {
      await expect(walletConnectWallet.associateToken("0.0.9999")).rejects.toThrow(
        "No signers found!"
      );
    });
  });

  describe("purchaseNfts", () => {
    const items = [
      { nftId: new NftId(TokenId.fromString("0.0.98765"), 7), showDate: "1998-07-29", position: 1 },
      { nftId: new NftId(TokenId.fromString("0.0.98765"), 8), showDate: "1998-07-29", position: 2 },
    ];

    it("signs, executes, and audits one NFT_PURCHASE entry per item on success", async () => {
      signers.push(fakeSigner("0.0.1234"));
      const tx = makeSignedTx("SUCCESS");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const success = await walletConnectWallet.purchaseNfts(tx as any, items);

      expect(success).toBe(true);
      expect(fetchJsonMock).toHaveBeenCalledTimes(2);
      expect(fetchJsonMock).toHaveBeenCalledWith(
        "/api/audit/0.0.1234",
        expect.objectContaining({ body: expect.stringContaining('"serial":7') })
      );
      expect(fetchJsonMock).toHaveBeenCalledWith(
        "/api/audit/0.0.1234",
        expect.objectContaining({ body: expect.stringContaining('"serial":8') })
      );
    });

    it("returns false and still audits every item as failed when the receipt isn't SUCCESS", async () => {
      signers.push(fakeSigner("0.0.1234"));
      const tx = makeSignedTx("FAIL");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const success = await walletConnectWallet.purchaseNfts(tx as any, items);

      expect(success).toBe(false);
      expect(fetchJsonMock).toHaveBeenCalledTimes(2);
      expect(fetchJsonMock).toHaveBeenCalledWith(
        "/api/audit/0.0.1234",
        expect.objectContaining({ body: expect.stringContaining('"success":false') })
      );
    });

    it("returns false and still audits every item when signing throws", async () => {
      signers.push(fakeSigner("0.0.1234"));
      const tx = {
        signWithSigner: vi.fn(async () => {
          throw new Error("wallet rejected");
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const success = await walletConnectWallet.purchaseNfts(tx as any, items);

      expect(success).toBe(false);
      expect(fetchJsonMock).toHaveBeenCalledTimes(2);
    });

    // One atomic transaction - all-or-nothing per Hedera's own semantics -
    // so every item's audit entry should agree on the same transactionId.
    it("shares one transactionId across every item's audit entry", async () => {
      signers.push(fakeSigner("0.0.1234"));
      const tx = makeSignedTx("SUCCESS");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await walletConnectWallet.purchaseNfts(tx as any, items);

      const bodies = fetchJsonMock.mock.calls.map((call: unknown[]) =>
        JSON.parse((call[1] as RequestInit).body as string)
      );
      expect(bodies[0].context.transactionId).toBe(bodies[1].context.transactionId);
      expect(bodies[0].context.transactionId).toBeTruthy();
    });

    it("throws when no wallet is connected", async () => {
      const tx = makeSignedTx("SUCCESS");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(walletConnectWallet.purchaseNfts(tx as any, items)).rejects.toThrow(
        "No signers found!"
      );
    });
  });

  describe("disconnect", () => {
    it("disconnects all WalletConnect sessions", async () => {
      await walletConnectWallet.disconnect();
      expect(disconnectAllMock).toHaveBeenCalledTimes(1);
    });
  });
});
