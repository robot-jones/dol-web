import type { NextConfig } from "next";
import dotenv from "dotenv";

// next.config.ts runs before Next's own env loading, so pull in .env
// ourselves to read NEXT_PUBLIC_PINATA_GATEWAY below.
dotenv.config();

// ipfsToHttps (dol-lib) serves images from whatever NEXT_PUBLIC_PINATA_GATEWAY
// is configured, falling back to the generic public gateway if unset - so
// both need to be allowlisted here, or next/image throws for whichever one
// isn't (see PUNCHLIST.md Finding 11).
const defaultPinataGateway = "gateway.pinata.cloud";
const configuredPinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
const pinataGateways = Array.from(
  new Set([defaultPinataGateway, configuredPinataGateway].filter(Boolean))
) as string[];

const nextConfig: NextConfig = {
  webpack: config => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // @sparticuz/chromium (dol-lib's serverless image-render path - see
  // PUNCHLIST.md Finding 16) resolves its binary via a dynamic path at
  // runtime, not a static import Next's bundler can trace. Keeping it (and
  // puppeteer-core) external means Next leaves it as a plain node_modules
  // dependency in the function output instead of trying to bundle it.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  /* config options here */
  images: {
    remotePatterns: pinataGateways.map((hostname) => ({
      protocol: "https" as const,
      hostname,
      port: "",
      pathname: "/ipfs/**",
    })),
  },
};

export default nextConfig;
