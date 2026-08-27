import { CLAIM_PROGRESS_STEPS, CLAIM_PROGRESS_STEP_INTERVAL_MS, getProgressStepIndex } from "./mint-progress";

describe("getProgressStepIndex", () => {
  it("returns 0 right when something's added", () => {
    const addedAt = 1000;
    expect(getProgressStepIndex(addedAt, addedAt)).toBe(0);
  });

  it("advances one step per CLAIM_PROGRESS_STEP_INTERVAL_MS elapsed", () => {
    const addedAt = 1000;
    expect(getProgressStepIndex(addedAt, addedAt + CLAIM_PROGRESS_STEP_INTERVAL_MS)).toBe(1);
    expect(getProgressStepIndex(addedAt, addedAt + CLAIM_PROGRESS_STEP_INTERVAL_MS * 2)).toBe(2);
  });

  it("stops advancing at the last step instead of looping", () => {
    const addedAt = 1000;
    const wayLater = addedAt + CLAIM_PROGRESS_STEP_INTERVAL_MS * 100;
    expect(getProgressStepIndex(addedAt, wayLater)).toBe(CLAIM_PROGRESS_STEPS.length - 1);
  });

  it("never goes negative if now is somehow before addedAt (clock skew)", () => {
    expect(getProgressStepIndex(2000, 1000)).toBe(0);
  });
});
