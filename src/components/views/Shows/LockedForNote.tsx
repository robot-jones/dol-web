import { msToTime } from "@erikmuir/dol-lib/utils";

export type LockedForNoteProps = {
  lockedAt?: number;
  now: number;
};

// Elapsed time, not a countdown - the sweep runs on its own schedule
// (~15m), so an exact "frees up in Xm" promise could visibly overshoot.
// Keep "~15m" in sync with reconcile-claims.js's EXPIRY_MINUTES.
export const LockedForNote = ({ lockedAt, now }: LockedForNoteProps): React.ReactNode => {
  if (!lockedAt) return null;
  return (
    <div className="text-xs text-gray-medium">
      Locked for {msToTime(now - lockedAt)} · auto-releases within ~15m if abandoned
    </div>
  );
};
