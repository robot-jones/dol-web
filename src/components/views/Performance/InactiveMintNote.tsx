import { CollectionMintStatus, CollectionMintStatusDisplayText } from "@erikmuir/dol-lib/types";
import { PageNote } from "@/components/common/PageNote";

export type InactiveMintNoteProps = {
  collectionMintStatus?: CollectionMintStatus;
  isPerformanceAvailable: boolean;
  isBlocked: boolean;
  isActive: boolean;
  isPresale: boolean;
  isWhitelisted: boolean;
};

export const InactiveMintNote = ({
  collectionMintStatus,
  isPerformanceAvailable,
  isBlocked,
  isActive,
  isPresale,
  isWhitelisted,
}: InactiveMintNoteProps): React.ReactNode => {
  if (!collectionMintStatus || !isPerformanceAvailable || isBlocked || isActive) {
    return null;
  }

  if (isPresale && isWhitelisted) {
    return (
      <PageNote color="green" className="text-center">
        {CollectionMintStatusDisplayText.PRE_SALE} But I saw you with a Ticket Stub in your hand, so you&apos;re allowed in early!
      </PageNote>
    );
  }

  return (
    <PageNote color="red" className="text-center">
      {CollectionMintStatusDisplayText[collectionMintStatus]}
    </PageNote>
  );
};
