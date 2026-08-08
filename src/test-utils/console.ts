import type { MockInstance } from "vitest";

let errorSpy: MockInstance | undefined;

export function suppressConsoleErrors(): void {
  beforeAll(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => {
    errorSpy?.mockRestore();
  });
}


