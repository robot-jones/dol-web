import { formatShowDate } from "./format";

describe("formatShowDate", () => {
  it("rearranges YYYY-MM-DD into MM/DD/YYYY", () => {
    expect(formatShowDate("2024-03-22")).toBe("03/22/2024");
  });
});
