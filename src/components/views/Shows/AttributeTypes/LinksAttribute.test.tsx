import { render, screen } from "@testing-library/react";
import { LinksAttribute } from "./LinksAttribute";

describe("LinksAttribute external links (Finding 44)", () => {
  it("opens every present link in a new tab without leaking window.opener", () => {
    render(
      <LinksAttribute
        dolLink="https://app.dukeoflizards.com/shows/1997-08-06/1"
        phishNetLink="https://phish.net/setlists/?d=1997-08-06"
        phishInLink="https://phish.in/1997-08-06"
      />
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
