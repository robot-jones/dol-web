import { middleware } from "@/middleware";

// Minimal NextRequest stub — middleware only touches .headers and .nextUrl.origin.
function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    nextUrl: { origin: "http://localhost:3000" },
  } as unknown as Parameters<typeof middleware>[0];
}

describe("middleware", () => {
  it("allows a request with Sec-Fetch-Site: same-origin", () => {
    const res = middleware(makeRequest({ "sec-fetch-site": "same-origin" }));
    expect(res.status).toBe(200);
  });

  it("blocks a cross-site request per Sec-Fetch-Site", () => {
    const res = middleware(makeRequest({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
  });

  it("falls back to comparing Origin against the request's own origin", () => {
    const res = middleware(makeRequest({ origin: "http://localhost:3000" }));
    expect(res.status).toBe(200);
  });

  it("rejects an Origin that doesn't match, even if a captured api key is replayed", () => {
    const res = middleware(makeRequest({ origin: "https://evil.example.com" }));
    expect(res.status).toBe(403);
  });

  it("falls back to Referer when Origin is absent", () => {
    const res = middleware(makeRequest({ referer: "http://localhost:3000/shows/2023-08-04/1" }));
    expect(res.status).toBe(200);
  });

  it("rejects when neither Sec-Fetch-Site nor Origin/Referer is present", () => {
    const res = middleware(makeRequest({}));
    expect(res.status).toBe(403);
  });

  it("rejects a malformed Origin header instead of throwing", () => {
    const res = middleware(makeRequest({ origin: "not a url" }));
    expect(res.status).toBe(403);
  });
});
