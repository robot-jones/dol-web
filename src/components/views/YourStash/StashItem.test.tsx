import { render, screen } from "@testing-library/react";
import { StashItem } from "./StashItem";

let mockMetadata: unknown;
let mockMetadataLoading = false;
let mockMetadataError: unknown;

vi.mock("@/hooks", () => ({
  useNftMetadata: () => ({
    metadata: mockMetadata,
    metadataLoading: mockMetadataLoading,
    metadataError: mockMetadataError,
  }),
}));

const readyMetadata = {
  name: "HFB #2: Buried Alive 19940623:1",
  image: "ipfs://bafybeid35hzp2hiqlgpafueolfe6lfjd7kssrcopdbynmjqsxyrgrqbt2e",
  attributes: [
    { trait_type: "song", value: "Buried Alive", display_type: "text" },
    { trait_type: "date", value: "1994-06-23", display_type: "text" },
    { trait_type: "position", value: 1, display_type: "text" },
    { trait_type: "venue", value: "Phoenix Plaza Theatre", display_type: "text" },
  ],
};

describe("StashItem card link readiness (Finding 49)", () => {
  beforeEach(() => {
    mockMetadata = undefined;
    mockMetadataLoading = true;
    mockMetadataError = undefined;
  });

  it("is not a link at all while metadata is still loading", () => {
    render(<StashItem tokenId="0.0.5835448" serial={2} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("stays inert, not href=\"#\", if metadata resolves with no date/position", () => {
    mockMetadataLoading = false;
    mockMetadata = { name: "broken", image: "ipfs://x", attributes: [] };
    render(<StashItem tokenId="0.0.5835448" serial={2} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("becomes a real link to the performance once date/position resolve", () => {
    mockMetadataLoading = false;
    mockMetadata = readyMetadata;
    render(<StashItem tokenId="0.0.5835448" serial={2} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/shows/1994-06-23/1");
  });
});
