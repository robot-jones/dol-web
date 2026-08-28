import { CollectionMintStatus, CollectionMintStatusDisplayText } from "@erikmuir/dol-lib/types";
import { PageNote } from "@/components/common/PageNote";

export type InactiveMintNoteProps = {
  collectionMintStatus?: CollectionMintStatus;
  isAvailable: boolean;
  isBlocked: boolean;
  isWhitelisted: boolean;
};

export const InactiveMintNote = ({
  collectionMintStatus,
  isAvailable,
  isBlocked,
  isWhitelisted,
}: InactiveMintNoteProps): React.ReactNode => {
  const isOpen = collectionMintStatus === CollectionMintStatus.OPEN;
  const isPresale = collectionMintStatus === CollectionMintStatus.PRE_SALE;

  if (!isAvailable || isBlocked || !collectionMintStatus || isOpen) {
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
