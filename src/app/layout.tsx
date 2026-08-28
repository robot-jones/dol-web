import React from "react";
import { Suspense } from "react";
import { twMerge } from "tailwind-merge";
import { Footer } from "@/components/globals/Footer";
import { Header } from "@/components/globals/Header";
import { jost } from "@/styles/fonts";
import "@/styles/globals.css";
import { Metadata } from "next";
import { WalletConnectContextProvider, WalletConnectClient } from "@/wallet";
import { CartContextProvider } from "@/cart";
import { CartValidator } from "@/cart/CartValidator";

const title = "Duke of Lizards";
const description = "A Phish-themed Web3 dApp built on Hedera";

export const metadata: Metadata = {
  title,
  description,
  icons: ["/logo.png"],
  manifest: "/manifest.json",
  metadataBase: new URL("https://app.dukeoflizards.com"),
  openGraph: {
    title,
    description,
    url: "/",
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
              <CartContextProvider>
                <WalletConnectClient />
                <CartValidator />
                <Header />
                <main className="grow shrink-0 basis-auto my-4 mx-0 sm:mx-4">
                  <div className="flex flex-col items-center mx-auto max-w-5xl mt-[var(--header-height)]">
                    {children}
                  </div>
                </main>
                <Footer />
                <div id="modal-root"></div>
              </CartContextProvider>
            </WalletConnectContextProvider>
          </Suspense>
        </React.StrictMode>
      </body>
    </html>
  );
}
