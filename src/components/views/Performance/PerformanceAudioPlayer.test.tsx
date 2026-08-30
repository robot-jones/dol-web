import { render, screen, fireEvent } from "@testing-library/react";
import { PerformanceAudioPlayer } from "./PerformanceAudioPlayer";

describe("PerformanceAudioPlayer", () => {
  it("renders nothing while there's no mp3 to play", () => {
    const { container } = render(<PerformanceAudioPlayer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading indicator instead of a button while loading", () => {
    render(<PerformanceAudioPlayer loading />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a closed, inert drawer without autoplaying, looping, or muting", () => {
    render(<PerformanceAudioPlayer src="https://phish.in/audio/track.mp3" />);

    const audio = document.querySelector("audio") as HTMLAudioElement;
    expect(audio).toHaveAttribute("controls");
    expect(audio).not.toHaveAttribute("autoplay");
    expect(audio).not.toHaveAttribute("loop");
    expect(audio.muted).toBe(false);

    const button = screen.getByRole("button", { name: "Show audio controls" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(audio.closest("[inert]")).not.toBeNull();
  });

  it("toggles the drawer open/closed without touching playback", () => {
    render(<PerformanceAudioPlayer src="https://phish.in/audio/track.mp3" />);

    const audio = document.querySelector("audio") as HTMLAudioElement;
    const playSpy = vi.spyOn(audio, "play");

    const button = screen.getByRole("button", { name: "Show audio controls" });
    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "Hide audio controls" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(audio.closest("[inert]")).toBeNull();
    expect(playSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Hide audio controls" }));
    expect(screen.getByRole("button", { name: "Show audio controls" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("closes the drawer when the src changes out from under it", () => {
    const { rerender } = render(
      <PerformanceAudioPlayer src="https://phish.in/audio/track-1.mp3" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Show audio controls" }));
    expect(screen.getByRole("button", { name: "Hide audio controls" })).toBeInTheDocument();

    rerender(<PerformanceAudioPlayer src="https://phish.in/audio/track-2.mp3" />);
    expect(screen.getByRole("button", { name: "Show audio controls" })).toBeInTheDocument();
  });
});
