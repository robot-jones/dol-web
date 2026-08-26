import { render, screen, fireEvent } from "@testing-library/react";
import { PerformanceAudioPlayer } from "./PerformanceAudioPlayer";

// jsdom doesn't implement real media playback, and its `paused` getter is
// hardwired to always return true - stub both play/pause and `paused`
// itself (backed by a real per-instance flag) so the component's own
// `audio.paused` check behaves like a real browser's.
beforeAll(() => {
  const pausedState = new WeakMap<HTMLMediaElement, boolean>();
  Object.defineProperty(window.HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return pausedState.get(this) ?? true;
    },
  });
  window.HTMLMediaElement.prototype.play = function () {
    pausedState.set(this, false);
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () {
    pausedState.set(this, true);
    this.dispatchEvent(new Event("pause"));
  };
});

describe("PerformanceAudioPlayer", () => {
  it("renders nothing while there's no mp3 to play", () => {
    const { container } = render(<PerformanceAudioPlayer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading indicator instead of a button while loading", () => {
    render(<PerformanceAudioPlayer loading />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("toggles play/pause on click, unmuted, without looping or autoplaying", () => {
    render(<PerformanceAudioPlayer src="https://phish.in/audio/track.mp3" />);

    const audio = document.querySelector("audio") as HTMLAudioElement;
    expect(audio).not.toHaveAttribute("autoplay");
    expect(audio).not.toHaveAttribute("loop");
    expect(audio.muted).toBe(false);

    const button = screen.getByRole("button", { name: "Play" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("resets to a paused/play state when the src changes out from under it", () => {
    const { rerender } = render(
      <PerformanceAudioPlayer src="https://phish.in/audio/track-1.mp3" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    rerender(<PerformanceAudioPlayer src="https://phish.in/audio/track-2.mp3" />);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});
