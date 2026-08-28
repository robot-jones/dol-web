import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { MirrorNft } from "@erikmuir/dol-lib/types";
import * as Utils from "@/utils";
import { useAccountNfts } from "./use-mirror";
import type { Mock } from "vitest";

vi.mock("@/utils", async () => ({
  ...(await vi.importActual("@/utils")),
  fetchStandardJson: vi.fn(),
}));

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

const nft = (serial: number, createdTimestamp: string): MirrorNft => ({
  accountId: "0.0.1",
  created_timestamp: createdTimestamp,
  delegating_spender: "",
  deleted: false,
  metadata: "",
  modified_timestamp: createdTimestamp,
  serial_number: serial,
  spended_id: "",
  token_id: "0.0.9999",
});

describe("useAccountNfts", () => {
  beforeEach(() => {
    (Utils.fetchStandardJson as unknown as Mock).mockReset();
  });

  // Regression (Erik's correction, 2026-08-27): serials are handed out
  // from whatever's available at claim time, not assigned in mint order
  // (deliberate, to minimize claim-time races) - so sorting by serial
  // doesn't actually reflect mint order. Deliberately out of serial order
  // here (#42 minted before #7) to prove the sort follows created_timestamp,
  // not serial_number.
  it("sorts by created_timestamp descending, not by serial", async () => {
    (Utils.fetchStandardJson as unknown as Mock).mockResolvedValueOnce([
      nft(7, "1755600300.000000000"),
      nft(42, "1755600100.000000000"),
      nft(3, "1755600200.000000000"),
    ]);

    const { result } = renderHook(() => useAccountNfts("0.0.9999", "0.0.1"), { wrapper });

    await waitFor(() => expect(result.current.nfts).toBeDefined());
    expect(result.current.nfts?.map((n) => n.serial_number)).toEqual([7, 3, 42]);
  });

  it("returns undefined nfts and no request with no accountId", () => {
    const { result } = renderHook(() => useAccountNfts("0.0.9999", null), { wrapper });
    expect(result.current.nfts).toBeUndefined();
    expect(Utils.fetchStandardJson).not.toHaveBeenCalled();
  });
});
