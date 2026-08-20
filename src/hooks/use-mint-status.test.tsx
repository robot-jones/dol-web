import { render, renderHook } from "@testing-library/react";
import { DolPerformance } from "@erikmuir/dol-lib/types";
import { useMintStatus } from "./use-mint-status";

const renderEmoji = (emoji: React.ReactNode) => render(<>{emoji}</>);

describe("useMintStatus", () => {
  it("returns Loading/gray while loading, regardless of performance", () => {
    const { result } = renderHook(() => useMintStatus(undefined, true));
    expect(result.current.label).toBe("Loading");
    expect(result.current.color).toBe("gray");
  });

  it("returns Unknown/gray when not loading and no performance resolved", () => {
    // Regression case: the pre-extraction logic in MintStatusIndicator
    // spread `providedPerformance`/`fetchedPerformance` into a fresh
    // object (`{ ...a, ...b }`), which is truthy even when both inputs
    // are undefined - so this branch was silently unreachable. Passing a
    // real possibly-undefined `performance` here is what makes it work.
    const { result } = renderHook(() => useMintStatus(undefined, false));
    expect(result.current.label).toBe("Unknown");
    expect(result.current.color).toBe("gray");
    const { container } = renderEmoji(result.current.emoji);
    expect(container).toHaveTextContent("❓");
  });

  it("returns Claimed/red when the performance has a serial", () => {
    const performance = { serial: 42 } as DolPerformance;
    const { result } = renderHook(() => useMintStatus(performance, false));
    expect(result.current.label).toBe("Claimed");
    expect(result.current.color).toBe("red");
    const { container } = renderEmoji(result.current.emoji);
    expect(container).toHaveTextContent("🔴");
  });

  it("returns Locked/yellow when the performance is locked but has no serial", () => {
    const performance = { lockedBy: "0.0.1234" } as DolPerformance;
    const { result } = renderHook(() => useMintStatus(performance, false));
    expect(result.current.label).toBe("Locked");
    expect(result.current.color).toBe("yellow");
    const { container } = renderEmoji(result.current.emoji);
    expect(container).toHaveTextContent("🟡");
  });

  it("returns Available/green when the performance is neither locked nor claimed", () => {
    const performance = {} as DolPerformance;
    const { result } = renderHook(() => useMintStatus(performance, false));
    expect(result.current.label).toBe("Available");
    expect(result.current.color).toBe("green");
    const { container } = renderEmoji(result.current.emoji);
    expect(container).toHaveTextContent("🟢");
  });

  it("prefers Claimed over Locked when a performance somehow has both", () => {
    const performance = { serial: 1, lockedBy: "0.0.1234" } as DolPerformance;
    const { result } = renderHook(() => useMintStatus(performance, false));
    expect(result.current.label).toBe("Claimed");
  });
});
