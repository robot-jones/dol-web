import { render, screen, fireEvent } from "@testing-library/react";
import { PerformanceAudioPlayer } from "./PerformanceAudioPlayer";

describe("PerformanceAudioPlayer", () => {
  it("still renders the button when there's no mp3 to play", () => {
    render(<PerformanceAudioPlayer />);
    expect(screen.getByRole("button", { name: "Show audio controls" })).toBeInTheDocument();
  });

  it("explains a recent show's audio isn't uploaded yet", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    render(<PerformanceAudioPlayer showDate={yesterday} />);

    fireEvent.click(screen.getByRole("button", { name: "Show audio controls" }));
    expect(screen.getByText("Audio hasn't been uploaded yet — check back soon.")).toBeInTheDocument();
    expect(document.querySelector("audio")).not.toBeInTheDocument();
  });

  it("tells an old show it has no recording", () => {
    render(<PerformanceAudioPlayer showDate="1998-07-29" />);

    fireEvent.click(screen.getByRole("button", { name: "Show audio controls" }));
    expect(
      screen.getByText("No mp3 recording exists for this performance.")
    ).toBeInTheDocument();
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
