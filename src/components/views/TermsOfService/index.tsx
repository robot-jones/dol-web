import { Shapes } from "@/components/common/Shapes";
import { LEGAL_TERMS_UPDATED } from "@/utils";

export const TermsOfService = (): React.ReactNode => {
  const divider = <div className="border-t border-gray-dark"></div>;

  return (
    <div className="flex flex-col items-center items-stretch gap-8 max-w-[680px] mt-8 px-4 text-lg text-justify">
      <div className="pb-8">
        <div className="text-center text-4xl uppercase tracking-widest">
          Terms of Service
        </div>
        <div className="text-gray-medium text-center text-xs pt-4">
          <span className="font-bold">Effective Date:</span> 7/15/2025
        </div>
        <div className="text-gray-medium text-center text-xs pt-1">
          <span className="font-bold">Last Updated:</span> {LEGAL_TERMS_UPDATED}
        </div>
      </div>
      <div>
        Welcome to Duke of Lizards, a decentralized application
        (&apos;dApp&apos;) celebrating the jam-fueled beauty of Phish live
        performances — one NFT at a time. By connecting your wallet and using
        this site, you agree to these Terms of Service (&apos;Terms&apos;). If
        you&apos;re not cool with them, the Helping Friendly Book advises you to
        kindly disconnect.
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          1. 👤 Who You Are (and Aren&apos;t)
        </div>
        You are a visitor to a web3 dApp, here to connect a Hedera-compatible
        wallet, associate a token, and mint a digital collectible representing a
        live Phish performance. You are not signing up for an account, and
        you&apos;re not providing personally identifying information beyond your
        wallet address.
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          2. 📖 What You&apos;re Doing
        </div>
        <div>Duke of Lizards allows you to:</div>
        <ul className="list-disc pl-8 pb-4">
          <li>
            <span className="font-bold">Connect your wallet</span>
          </li>
          <li>
            <span className="font-bold">Associate the token</span>
          </li>
          <li>
            <span className="font-bold">
              Claim a page in the Helping Friendly Book
            </span>{" "}
            <span className="italic">(we like our lore)</span>
          </li>
          <li>
            <span className="font-bold">Confirm token transfer</span>
          </li>
        </ul>
        <div>
          You acknowledge that all tokens are collectibles, not investments, and
          have no guaranteed or implied value beyond their groove. 🚫 No
          securities here — just vibes.
        </div>
        <div className="pt-4">
          Minting isn&apos;t always open to everyone at once. We may grant
          certain wallets a <span className="font-bold">Ticket Stub</span>{" "}
          for early access, pause minting temporarily, or close it
          permanently once the Book reaches its page limit or otherwise
          draws to a close. None of that changes what you already hold —
          only what you&apos;re able to claim going forward.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          3. 🤝 Transaction (Gas) Fees
        </div>
        <div>
          All transactions are executed through the Hedera Token Service (HTS)
          on the public Hedera Network. You are solely responsible for any
          transaction costs (e.g., HBAR fees) associated with your wallet&apos;s
          interactions. Once minted, NFTs are yours. Duke of Lizards does not
          offer refunds, reversals, or customer support if your wallet gets lost
          in a Rift.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          4. 🔮 No Promises, No Llamas
        </div>
        <div>The dApp is offered &quot;as-is.&quot; We don&apos;t promise:</div>
        <ul className="list-disc pl-8 pb-4">
          <li>That the dApp will always be up</li>
          <li>That your mint won&apos;t fail due to network issues</li>
          <li>
            That Vercel, DynamoDB, or the Wook behind the curtain won&apos;t go
            down
          </li>
        </ul>
        <div>
          Use this site at your own risk. If something breaks — spiritually,
          emotionally, or technically — we may fix it, but we don&apos;t
          guarantee we can.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          5. 📡 Third-Party Services
        </div>
        <div>Duke of Lizards integrates:</div>
        <ul className="list-disc pl-8 pb-4">
          <li>
            <span className="font-bold">WalletConnect</span> (wallet
            connection)
          </li>
          <li>
            <span className="font-bold">Pinata.cloud</span> (IPFS pinning
            service)
          </li>
          <li>
            <span className="font-bold">Phish.net</span> (setlists, lyrics, and
            song data)
          </li>
          <li>
            <span className="font-bold">Phish.in</span> (audio playback)
          </li>
          <li>
            <span className="font-bold">AWS DynamoDB</span> (tracking token
            states)
          </li>
          <li>
            <span className="font-bold">Hedera Mirror Node</span> (reading
            public blockchain data)
          </li>
          <li>
            <span className="font-bold">Vercel</span> (deployment)
          </li>
        </ul>
        <div>
          We don&apos;t control these services and aren&apos;t responsible if
          they go down.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          6. 📜 Intellectual Property
        </div>
        <div>
          Much of the data backing this site is sourced from public APIs, but
          the rest is owned by{" "}
          <span className="font-bold">Duke of Lizards</span> and/or{" "}
          <span className="font-bold">RobotJones</span>. The band{" "}
          <span className="font-bold">Phish</span> owns its music, lore, and
          trademarks — this site is a fan project, not affiliated with or
          endorsed by Phish, nor the Spirit of Icculus.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          7. 🛡️ Limitation of Liability
        </div>
        <div>To the fullest extent allowed by law:</div>
        <ul className="list-disc pl-8 pb-4">
          <li>
            Duke of Lizards and RobotJones aren&apos;t liable for lost tokens,
            failed transactions, mis-clicked mints, or existential dread.
          </li>
          <li>
            You waive any claims against us arising from your use of the site,
            even if Wilson told you to.
          </li>
        </ul>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">8. ⚖️ Governing Law</div>
        <div>
          We do not currently designate a specific jurisdiction. However, by
          using this dApp, you agree that any legal disputes will be resolved
          according to applicable laws, should they arise, preferably outside
          the jurisdiction of Gamehendge.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">9. ✍️ Updates</div>
        <div>
          We may update these Terms occasionally. You won&apos;t get a memo, but
          changes will be posted on this page. Continued use = agreement.
        </div>
      </div>
      {divider}
      <div>
        By connecting your wallet, you agree to these Terms. If you&apos;re ever
        unsure, consult the Helping Friendly Book.
        <br />
        <div className="p-2 italic text-right">
          – RobotJones, Custodian of the Helping Friendly Book
        </div>
      </div>
      <div className="mx-auto my-8">
        <Shapes />
      </div>
    </div>
  );
};
