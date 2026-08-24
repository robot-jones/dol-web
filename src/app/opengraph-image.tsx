import { ImageResponse } from "next/og";
import { DolColorHex } from "@erikmuir/dol-lib/types";

// Generated server-side from the real brand colors/nav copy instead of a
// hand-taken screenshot, so a nav/copy change can't silently leave the
// social preview (Twitter/Discord link unfurl) showing stale content the
// way the old static public/dol-preview.png did.

export const alt = "Duke of Lizards";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const navTabs: { name: string; color: DolColorHex }[] = [
  { name: "Home", color: DolColorHex.Blue },
  { name: "The Book", color: DolColorHex.Green },
  { name: "Your Stash", color: DolColorHex.Red },
  { name: "Duke's Log", color: DolColorHex.Yellow },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          backgroundColor: DolColorHex.Dark,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Circle color={DolColorHex.Blue} />
          <Square color={DolColorHex.Green} />
          <Square color={DolColorHex.Yellow} />
          <Circle color={DolColorHex.Red} />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: DolColorHex.Light,
            letterSpacing: 2,
          }}
        >
          Duke of Lizards
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: DolColorHex.Light,
            opacity: 0.7,
          }}
        >
          A Phish-themed Web3 dApp built on Hedera
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 8 }}>
          {navTabs.map((tab) => (
            <div
              key={tab.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: DolColorHex.Light }}>
                {tab.name}
              </div>
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 8,
                  backgroundColor: tab.color,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}

const Circle = ({ color }: { color: DolColorHex }) => (
  <svg width="90" height="90" viewBox="0 0 100 100">
    <circle
      cx="50"
      cy="50"
      r="37"
      fill="transparent"
      stroke={color}
      strokeWidth="18"
    />
  </svg>
);

const Square = ({ color }: { color: DolColorHex }) => (
  <svg width="90" height="90" viewBox="0 0 100 100">
    <rect
      x="13"
      y="13"
      width="74"
      height="74"
      fill="transparent"
      stroke={color}
      strokeWidth="18"
    />
  </svg>
);
