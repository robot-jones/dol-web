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
