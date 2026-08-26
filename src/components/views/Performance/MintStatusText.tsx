import { MintStatusDisplayText } from "@erikmuir/dol-lib/types";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { CLAIM_PROGRESS_STEPS } from "./mintProgress";

export type MintStatusTextProps = {
  performanceLoading: boolean;
  status: MintStatusDisplayText;
  claimProgressStep: number;
};

export const MintStatusText = ({
  performanceLoading,
  status,
  claimProgressStep,
}: MintStatusTextProps): React.ReactNode => {
  if (performanceLoading) return null;

  if (status === MintStatusDisplayText.Claiming) {
    return (
      <div className="flex items-center gap-2 text-dol-yellow">
        <AnimatedDonut sizeInPixels={16} />
        <span>{CLAIM_PROGRESS_STEPS[claimProgressStep]}</span>
      </div>
    );
  }

  return status !== MintStatusDisplayText.None &&
    status !== MintStatusDisplayText.AlreadyMinted ? (
    <div className="text-dol-yellow">{status}</div>
  ) : null;
};
