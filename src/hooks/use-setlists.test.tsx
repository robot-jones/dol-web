import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import * as Utils from "@/utils";
import { useSetlists, useSetlistsBySongId, useSetlistsBySongSlug, useSetlist } from "./use-setlists";
import type { Mock } from "vitest";

vi.mock("@/utils", async () => ({
  ...(await vi.importActual("@/utils")),
  fetchStandardJson: vi.fn(),
}));

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

describe("use-setlists hooks", () => {
  beforeEach(() => {
    (Utils.fetchStandardJson as unknown as Mock).mockReset();
  });

  it("useSetlists returns array", async () => {
    (Utils.fetchStandardJson as unknown as Mock).mockResolvedValueOnce([{ id: 1 }]);
    const { result } = renderHook(() => useSetlists("1994-07-08"), { wrapper });
    await waitFor(() => expect(result.current.setlists).toBeDefined());
  });

  it("useSetlistsBySongId returns array", async () => {
    (Utils.fetchStandardJson as unknown as Mock).mockResolvedValueOnce([{ id: 2 }]);
    const { result } = renderHook(() => useSetlistsBySongId(1), { wrapper });
    await waitFor(() => expect(result.current.setlists).toBeDefined());
  });

  it("useSetlistsBySongSlug returns array", async () => {
    (Utils.fetchStandardJson as unknown as Mock).mockResolvedValueOnce([{ id: 3 }]);
    const { result } = renderHook(() => useSetlistsBySongSlug("slug"), { wrapper });
    await waitFor(() => expect(result.current.setlists).toBeDefined());
  });

  it("useSetlist returns item", async () => {
    (Utils.fetchStandardJson as unknown as Mock).mockResolvedValueOnce({ id: 4 });
    const { result } = renderHook(() => useSetlist("1994-07-08", "1"), { wrapper });
    await waitFor(() => expect(result.current.setlist).toBeDefined());
  });
});


