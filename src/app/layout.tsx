import React from "react";
import { Suspense } from "react";
import { twMerge } from "tailwind-merge";
import { Footer } from "@/components/globals/Footer";
import { Header } from "@/components/globals/Header";
import { jost } from "@/styles/fonts";
import "@/styles/globals.css";
import { Metadata } from "next";
import { WalletConnectContextProvider, WalletConnectClient } from "@/wallet";

export const metadata: Metadata = {
  title: "Duke of Lizards",
  description: "A Phish-themed Web3 dApp built on Hedera",
  icons: ["/logo.png"],
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta property="og:title" content="Duke of Lizards" />
        <meta
          property="og:description"
          content="A Phish-themed Web3 dApp built on Hedera"
        />
        <meta
          property="og:image"
          content="https://app.dukeoflizards.com/dol-preview.png"
        />
        <meta property="og:url" content="https://app.dukeoflizards.com" />
        <meta property="og:type" content="website" />
      </head>
      <body
        className={twMerge(
          jost.className,
          "antialiased text-dol-light bg-dol-dark tracking",
          "flex flex-col min-h-screen",
          "relative"
        )}
      >
        <React.StrictMode>
          <Suspense>
            <WalletConnectContextProvider>
              <WalletConnectClient />
              <Header />
              <main className="grow shrink-0 basis-auto m-4">
                <div className="flex flex-col items-center mx-auto max-w-[1024px] mt-[var(--header-height)]">
                  {children}
                </div>
              </main>
              <Footer />
              <div id="modal-root"></div>
            </WalletConnectContextProvider>
          </Suspense>
        </React.StrictMode>
      </body>
    </html>
  );
}
