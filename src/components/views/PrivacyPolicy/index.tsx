import { Shapes } from "@/components/common/Shapes";

export const PrivacyPolicy = (): React.ReactNode => {
  const divider = <div className="border-t border-gray-dark"></div>;

  return (
    <div className="flex flex-col items-center items-stretch gap-8 max-w-[680px] mt-8 px-4 text-lg text-justify">
      <div className="pb-8">
        <div className="text-center text-4xl uppercase tracking-widest">
          Privacy Policy
        </div>
        <div className="text-gray-medium text-center text-xs pt-4">
          <span className="font-bold">Effective Date:</span> 7/15/2025
        </div>
        <div className="text-gray-medium text-center text-xs pt-1">
          <span className="font-bold">Last Updated:</span> 8/16/2026
        </div>
      </div>
      <div>
        We value your privacy — and your vibe. This policy explains what
        information we collect, how we use it, and how little we really want to
        be in your business. TL;DR: we collect your wallet address, and not much
        else.
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">1. 🧠 What We Collect</div>
        <div>
          When you interact with Duke of Lizards, we may collect the following:
        </div>
        <ul className="list-disc pl-8 pb-4">
          <li>
            <span className="font-bold">Wallet Address</span>
            <br />
            When you lock a performance for minting, we store your wallet
            address alongside token metadata in a DynamoDB table. This helps us
            ensure nobody double-mints a jam from 12/30/97.
          </li>
          <li>
            <span className="font-bold">Account Status</span>
            <br />
            If you&apos;ve been handed a <span className="italic">Ticket
            Stub</span> for early access, or blocked for abusing the minting
            process (repeatedly locking and abandoning claims, say), we store
            that status against your wallet address too.
          </li>
        </ul>
        <div>
          One more thing: Hedera is a public ledger, and we surface some of
          this bookkeeping ourselves on the site&apos;s own{" "}
          <span className="italic">Duke&apos;s Log</span> page — which
          performances got claimed or released, and by which wallet. We
          didn&apos;t invent that transparency; the chain already has it.
          We&apos;re just not hiding it either.
        </div>
        <div className="pt-4">We do not collect:</div>
        <ul className="list-disc pl-8 pb-4">
          <li>Names</li>
          <li>Emails</li>
          <li>IP addresses</li>
          <li>Browser fingerprints</li>
          <li>Sandwich orders</li>
        </ul>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">2. 🛠 How We Use It</div>
        <div>We use your wallet address solely to:</div>
        <ul className="list-disc pl-8 pb-4">
          <li>Track which NFT performances are locked or claimed</li>
          <li>Associate minted tokens with your wallet</li>
          <li>Prevent conflicts during the minting process</li>
          <li>
            Determine whether you get in early on a <span className="italic">
            Ticket Stub</span> before the Book opens to everyone
          </li>
          <li>Block wallets that abuse the minting process</li>
        </ul>
        <div>
          We do <span className="font-bold">not</span> use your data for
          advertising, profiling, or selling to third parties. You&apos;re not a
          product — you&apos;re a cherished author of the Helping Friendly Book.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          3. 🔌 Third-Party Services
        </div>
        <div>Duke of Lizards uses:</div>
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
            <span className="font-bold">AWS DynamoDB</span> (data storage)
          </li>
          <li>
            <span className="font-bold">Hedera Mirror Node</span> (public
            blockchain data)
          </li>
          <li>
            <span className="font-bold">Phish.net &amp; Phish.in APIs</span>{" "}
            (song info and audio)
          </li>
          <li>
            <span className="font-bold">Vercel</span> (hosting)
          </li>
        </ul>
        <div>
          These services may have their own data collection practices, such as
          logging IPs for traffic analysis or CDN behavior. We don&apos;t
          control them, but we also don&apos;t embed any extra analytics tools
          or cookies.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">4. 🔐 How We Secure It</div>
        <div>
          We take reasonable steps to secure your wallet address and performance
          data using:
        </div>
        <ul className="list-disc pl-8 pb-4">
          <li>Access-restricted AWS infrastructure</li>
          <li>Secure APIs</li>
          <li>No unnecessary logging or tracking</li>
        </ul>
        <div>
          That said, no system is 100% secure. If the Sloth breaks in and eats
          the logs, we can&apos;t promise to recover them.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          5. 🚫 No Age Data, No KYC
        </div>
        <div>
          We don&apos;t knowingly collect data from anyone under 13, nor do we
          perform identity verification. If you&apos;re here, you&apos;re assumed to
          be old enough to groove and legally able to connect a wallet.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">6. ⚖️ Legal Stuff</div>
        <div>
          We currently operate without a formal legal jurisdiction. However, any
          disputes or claims will be resolved according to applicable laws.
        </div>
        <br />
        <div>
          If laws change — say, a King imposes a new privacy decree — we&apos;ll
          update this policy accordingly.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">
          7. 🔁 Changes to This Policy
        </div>
        <div>
          This policy may be updated occasionally. Changes will be posted here,
          and we&apos;ll update the “Last Updated” date above. Continued use of
          the site means you accept those changes.
        </div>
      </div>
      {divider}
      <div>
        <div className="text-xl pb-2 text-center">8. 📫 Contact</div>
        <div>Questions? Concerns? Want to know if your NFT is sentient?</div>
        <br />
        <div>
          You can reach out through the Discord server or email{" "}
          <a href="mailto:dukeoflizards25@gmail.com" className="text-dol-blue">
            dukeoflizards25@gmail.com
          </a>{" "}
          and we&apos;ll do our best to answer, assuming we&apos;re not knee
          deep in the motel tub.
        </div>
      </div>
      {divider}
      <div>
        <div className="p-2 italic text-right">
          – RobotJones, Head Custodian of Privacy in the Land of Lizards
        </div>
      </div>
      <div className="mx-auto my-8">
        <Shapes />
      </div>
    </div>
  );
};
