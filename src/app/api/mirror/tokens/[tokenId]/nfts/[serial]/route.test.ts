process.env.PINATA_GATEWAY = "dedicated.mypinata.cloud";

const getNftInfoMock = vi.fn();
vi.mock("@erikmuir/dol-lib/server/api", () => ({
  getMirrorClient: () => ({ getNftInfo: (...a: unknown[]) => getNftInfoMock(...a) }),
}));

import { GET } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (tokenId: string, serial: string) => GET({} as any, { params: Promise.resolve({ tokenId, serial }) });

const metadataUri = "ipfs://bafkreitestcid";
// The route does atob(Buffer.from(tokenNftInfo.metadata).toString("utf8"))
// - Buffer.from(string) is a no-op round-trip for a plain base64 string,
// so tokenNftInfo.metadata just needs to be metadataUri's base64 form.
const nftInfo = { metadata: btoa(metadataUri) };

describe("/api/mirror/tokens/[tokenId]/nfts/[serial] GET", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    getNftInfoMock.mockResolvedValue(nftInfo);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns not found when the mirror node has no metadata pointer at all", async () => {
    getNftInfoMock.mockResolvedValueOnce(undefined);
    const res = await call("0.0.token", "1");
    expect(res.status).toBe(404);
  });

  it("returns metadata from the dedicated gateway on the normal path", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ name: "HFB #1" }) });
    const res = await call("0.0.token", "1");
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://dedicated.mypinata.cloud/ipfs/bafkreitestcid");
    expect(body.data).toEqual({ name: "HFB #1" });
  });

  // Regression (found live 2026-08-28): a CID pinned under a different/
  // since-rotated Pinata account 403s on the dedicated gateway even though
  // it's still retrievable via IPFS generally - the old code (dol-lib's
  // downloadMetadataFromPinata, the Pinata SDK's own gateway client) threw
  // an unhandled rejection out of the SDK on exactly this failure, turning
  // into a bare 500 with no recovery. This is what actually recovers it.
  it("falls back to the public gateway when the dedicated gateway fails", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: "HFB #2" }) });

    const res = await call("0.0.token", "2");
    const body = await res.json();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://dedicated.mypinata.cloud/ipfs/bafkreitestcid");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://gateway.pinata.cloud/ipfs/bafkreitestcid");
    expect(body.data).toEqual({ name: "HFB #2" });
  });

  it("also falls back when the dedicated gateway request itself throws", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: "HFB #2" }) });

    const res = await call("0.0.token", "2");
    const body = await res.json();

    expect(body.data).toEqual({ name: "HFB #2" });
  });

  it("returns a clean 500 (not a crash) when every gateway fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const res = await call("0.0.token", "2");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
  });
});
