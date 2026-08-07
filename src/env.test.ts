import { isWhiteList } from "@/env";

describe("isWhiteList", () => {
  const originalWhiteList = process.env.NEXT_PUBLIC_WHITE_LIST;

  afterEach(() => {
    process.env.NEXT_PUBLIC_WHITE_LIST = originalWhiteList;
  });

  it("returns false for a null accountId", () => {
    process.env.NEXT_PUBLIC_WHITE_LIST = "0.0.111,0.0.222";
    expect(isWhiteList(null)).toBe(false);
  });

  it("returns true for an exact match", () => {
    process.env.NEXT_PUBLIC_WHITE_LIST = "0.0.111,0.0.222";
    expect(isWhiteList("0.0.222")).toBe(true);
  });

  it("returns false for a digit-substring of a whitelisted account", () => {
    process.env.NEXT_PUBLIC_WHITE_LIST = "0.0.5520681";
    expect(isWhiteList("0.0.552068")).toBe(false);
    expect(isWhiteList("0.0.520681")).toBe(false);
  });

  it("tolerates whitespace around entries", () => {
    process.env.NEXT_PUBLIC_WHITE_LIST = "0.0.111, 0.0.222 ,0.0.333";
    expect(isWhiteList("0.0.222")).toBe(true);
  });

  it("returns false when nothing is configured", () => {
    delete process.env.NEXT_PUBLIC_WHITE_LIST;
    expect(isWhiteList("0.0.222")).toBe(false);
  });
});
