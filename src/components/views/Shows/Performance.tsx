import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { NftId, TokenId, TransferTransaction } from "@hashgraph/sdk";
import {
  CollectionMintStatus,
  CollectionMintStatusDisplayText,
  DolColorHex,
  MintStatusDisplayText,
  PerformanceAttributes,
  PreTransferResponse,
  SerialErrorResponse,
  SetlistLine,
  Subject,
  Uint8ArrayWrapper,
} from "@erikmuir/dol-lib/types";
import {
  ipfsToHttps,
  boldIndicator,
  msToTime,
} from "@erikmuir/dol-lib/utils";
import {
  extractBgColor,
  extractDonut,
  extractSubject,
  getSetlistLines,
  bgColors,
  donutColors,
  getRandomAttribute,
  subjects,
  getSetText,
} from "@erikmuir/dol-lib/dapp";
import { AnimatedDonut } from "@/components/common/AnimatedDonut";
import { Loading } from "@/components/common/Loading";
import { MintStatusBanner } from "@/components/common/MintStatusBanner";
import {
  AuditLogsAttribute,
  DynamicAttributes,
  FixedAttributes,
  ImageAttributes,
  SectionHeader,
  OtherAttributes,
} from "@/components/views/Shows/Attributes";
import {
  useAccountStatus,
  useAppConfigStatus,
  useIsTokenAssociated,
  useNftMetadata,
  usePerformance,
  useSetlist,
  useSetlists,
  useSong,
  useTrack,
  useWalletInterface,
} from "@/hooks";
import { fetchStandardJson } from "@/utils";
import { openWalletConnectModal } from "@/wallet";
import { NFTPlaceholder } from "./NFTPlaceholder";
import { PageNote } from "@/components/common/PageNote";
import { DolButton } from "@/components/common/DolButton";

// Narrower than PreTransferResponse (whose txBytes is optional) - by the
// time we ever set preparedTx, serial/txBytes are always populated together.
type PreparedTransfer = {
  serial: number;
  txBytes: Uint8ArrayWrapper;
  lockedAt?: number;
};

// Approximate progress only - the pre-transfer route isn't streaming, so
// there's no real signal for when each step finishes (Finding 50). Stops
// advancing at the last message instead of looping.
const CLAIM_PROGRESS_STEPS = [
  MintStatusDisplayText.Claiming,
  "Rendering your NFT image...",
  "Uploading to IPFS...",
  "Finalizing on-chain metadata...",
  "Almost there...",
] as const;
const CLAIM_PROGRESS_STEP_INTERVAL_MS = 4000;

// How long to wait for the wallet before showing the "check another
// window" hint (Finding 51). Confirmed via live testing short enough to
// avoid flicker on a normal approval.
const WALLET_WAIT_HINT_DELAY_MS = 2000;

export const Performance = (): React.ReactNode => {
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const date = pathParts.at(-2) ?? "";
  const position = pathParts.at(-1) ?? "";
  const parsedPosition = parseInt(position, 10);
  const hfbCollectionId = `${process.env.NEXT_PUBLIC_HFB_COLLECTION_ID}`;

  const [songId, setSongId] = useState<number>();
  const [bgColor, setBgColor] = useState<DolColorHex>(DolColorHex.Dark);
  const [donut, setDonut] = useState<DolColorHex | undefined>(DolColorHex.Red);
  const [subject, setSubject] = useState<Subject | undefined>(Subject.Lizard);
  const [attributes, setAttributes] = useState<PerformanceAttributes>({});
  const [status, setStatus] = useState<MintStatusDisplayText>(MintStatusDisplayText.None);
  const [associateError, setAssociateError] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showImageAttributes, setShowImageAttributes] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  // "Am I mid-flow" - set once claimed, cleared once signAndFinalize
  // resolves (Finding 51: fires automatically, no second click).
  const [preparedTx, setPreparedTx] = useState<PreparedTransfer | null>(null);
  // Index into CLAIM_PROGRESS_STEPS.
  const [claimProgressStep, setClaimProgressStep] = useState(0);
  const [walletWaitTimedOut, setWalletWaitTimedOut] = useState(false);
  const walletWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [releasingClaim, setReleasingClaim] = useState(false);
  // Set if the user releases while purchaseNft is still pending in this
  // tab - tells signAndFinalize's later continuation not to touch UI
  // state the user's already moved past.
  const releasedWhilePendingRef = useRef(false);

  const { setlist, setlistLoading } = useSetlist(date, position);
  const { setlists, setlistsLoading } = useSetlists(date);
  const { song, songLoading } = useSong(songId);
  const { track, trackLoading } = useTrack(date, parsedPosition);
  const { performance, performanceLoading, mutatePerformance } = usePerformance(date, parsedPosition);
  const { metadata, metadataLoading } = useNftMetadata(hfbCollectionId, performance?.serial);
  const { accountId, walletInterface } = useWalletInterface();
  const { isAssociated, isAssociatedLoading, mutateIsAssociated } = useIsTokenAssociated(hfbCollectionId, accountId);
  const { accountStatus, accountStatusLoading } = useAccountStatus(accountId);
  const { appConfigStatus } = useAppConfigStatus();

  const whitelisted = Boolean(accountStatus?.whitelisted);
  const blocked = Boolean(accountStatus?.blocked);
  // Undefined while loading defaults to false, same fail-closed default
  // the route side uses.
  const mintEnabled = Boolean(appConfigStatus?.mintEnabled);
  const collectionMintStatus = appConfigStatus?.collectionMintStatus;

  // Set songId from setlist, which will in turn fetch the song
  useEffect(() => {
    if (setlist) {
      setSongId(setlist.songId);
    }
  }, [setlist]);

  // Ticks `now` while this performance is locked (by anyone, including a
  // claim just made in this tab via preparedTx), so the elapsed-time note
  // stays live without needing a network refetch - lockedAt is a fixed
  // timestamp, only "now" needs to move.
  useEffect(() => {
    if (!performance?.lockedBy && !preparedTx) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [performance?.lockedBy, preparedTx]);

  // Advances CLAIM_PROGRESS_STEPS while claiming, resets otherwise.
  useEffect(() => {
    if (status !== MintStatusDisplayText.Claiming) {
      setClaimProgressStep(0);
      return;
    }
    const interval = setInterval(() => {
      setClaimProgressStep((step) =>
        Math.min(step + 1, CLAIM_PROGRESS_STEPS.length - 1)
      );
    }, CLAIM_PROGRESS_STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  // Update performance attributes when sources change
  useEffect(() => {
    const newAttributes: PerformanceAttributes = {
      bgColor,
      donut,
      subject,
    };

    if (setlist) {
      const normalizedDate = setlist.showDate.replaceAll("-", "");
      newAttributes.performanceId = `${normalizedDate}:${setlist.position}`;
      newAttributes.song = setlist.song;
      newAttributes.date = setlist.showDate;
      newAttributes.set = getSetText(setlist.set);
      newAttributes.position = setlist.position;
      newAttributes.venue = setlist.venue;
      newAttributes.city = setlist.city;
      newAttributes.state = setlist.state;
      newAttributes.country = setlist.country;
      newAttributes.tour = setlist.tourName || setlist.tourWhen;
      newAttributes.gap = setlist.gap;
      newAttributes.footnote = setlist.footnote;

      if (setlists) {
        const prev = setlists.find(
          (s) => s.set === setlist.set && s.position === setlist.position - 1
        );
        if (prev) {
          const transMark = prev.transition > 1 ? prev.transMark : "";
          newAttributes.prevSong = `${prev.song}${transMark}`;
        }

        const next = setlists.find(
          (s) => s.set === setlist.set && s.position === setlist.position + 1
        );
        if (next) {
          const transMark = setlist.transition > 1 ? setlist.transMark : "";
          newAttributes.nextSong = `${transMark}${next.song}`;
        }
      }
    }

    if (song) {
      newAttributes.alias = song.abbr;
      newAttributes.artist = song.artist;
      newAttributes.debut = song.debut;
    }

    if (track) {
      newAttributes.alias ||= track.songs[0].alias;
      newAttributes.mp3 = track.mp3Url;
      newAttributes.runtime = track.durationMs
        ? msToTime(track.durationMs)
        : undefined;
    }

    setAttributes(newAttributes);
  }, [bgColor, donut, subject, track, setlist, setlists, song]);

  // Set status to Already Minted if the performance has a serial
  useEffect(() => {
    if (performance && performance.serial) {
      setStatus(MintStatusDisplayText.AlreadyMinted);
    }
  }, [performance]);

  // Set bgColor, donut, and subject from metadata
  useEffect(() => {
    if (metadata && metadata.attributes) {
      setBgColor(extractBgColor(metadata.attributes, DolColorHex.Dark));
      setDonut(extractDonut(metadata.attributes));
      setSubject(extractSubject(metadata.attributes));
    }
  }, [metadata]);

  // Set showImageAttributes and pageLoaded based on loading states
  useEffect(() => {
    if (!showImageAttributes) {
      setShowImageAttributes(
        !setlistLoading && !performanceLoading && !metadataLoading
      );
    }
    if (!pageLoaded) {
      setPageLoaded(
        !setlistLoading &&
          !setlistsLoading &&
          !songLoading &&
          !trackLoading &&
          !performanceLoading &&
          !metadataLoading
      );
    }
  }, [
    setlistLoading,
    setlistsLoading,
    songLoading,
    trackLoading,
    performanceLoading,
    metadataLoading,
    pageLoaded,
    showImageAttributes,
  ]);

  const handleBgColorChanged = useCallback((color?: string) => {
    if (color) setBgColor(color as DolColorHex);
  }, [setBgColor]);

  const handleDonutChanged = useCallback((color?: string) => {
    if (color) setDonut(color as DolColorHex);
  }, [setDonut]);

  const handleSubjectChanged = useCallback((position?: string) => {
    if (position) setSubject(position as Subject);
  }, [setSubject]);

  const randomizeAttributes = () => {
    const randomBgColor = getRandomAttribute<DolColorHex>(bgColors);
    const randomDonut = getRandomAttribute<DolColorHex>(donutColors);
    const randomSubject = getRandomAttribute<Subject>(subjects);
    setBgColor(randomBgColor);
    setDonut(randomDonut === randomBgColor ? undefined : randomDonut);
    setSubject(randomSubject);
  };

  const handleRandomizeKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Now that ImageAttributes' randomize control has role="button"
    // (Finding 39), Space should activate it too, matching a native
    // <button>'s keyboard contract, not just Enter.
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      randomizeAttributes();
    }
  }, []);

  const handleRandomizeClick = useCallback(() => {
    randomizeAttributes();
  }, []);

  const handleConnectClick = async () => {
    openWalletConnectModal();
  };

  const handleAssociateClick = async () => {
    setAssociateError(false);
    try {
      const success = await walletInterface?.associateToken(hfbCollectionId);
      if (success) {
        mutateIsAssociated(true);
      } else {
        setAssociateError(true);
      }
    } catch {
      setAssociateError(true);
    }
  };

  // Self-service release (Finding 52) - safe even if purchaseNft is still
  // pending in this tab, since releaseClaim itself verifies on-chain
  // ownership before releasing anything. releasedWhilePendingRef tells
  // signAndFinalize's later continuation not to touch UI state we're
  // about to reset here. The abort route always responds success
  // regardless of outcome, so the revalidation below is what surfaces the
  // true result either way.
  const handleReleaseClick = async () => {
    if (!preparedTx && !performance?.lockedBy) return;

    if (preparedTx) {
      releasedWhilePendingRef.current = true;
      setPreparedTx(null);
      updateStatus(MintStatusDisplayText.None);
    }

    setReleasingClaim(true);
    try {
      await fetchStandardJson(
        `/api/mint/${accountId}/${date}/${position}/0/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "USER_CANCELLED" }),
        }
      );
    } catch (err) {
      console.error("Release request failed:", err);
    } finally {
      setReleasingClaim(false);
      mutatePerformance();
    }
  };

  const updateStatus = (newStatus: MintStatusDisplayText) => {
    setStatus(newStatus);
  };

  // signAndFinalize fires automatically once this resolves (Finding 51) -
  // no second click, even though this isn't technically a fresh user
  // gesture either. getMintButton's "check another window" hint is the
  // fallback for when the wallet doesn't grab focus on its own.
  const handleClaimClick = async () => {
    if (!pageLoaded || !setlist) {
      return;
    }
    if (performance?.serial) {
      updateStatus(MintStatusDisplayText.AlreadyMinted);
      return;
    }

    updateStatus(MintStatusDisplayText.Claiming);

    // Unhandled throw here used to leave the button disabled forever
    // (Finding 31) - fetchStandardJson throws on any unmodeled error.
    let response: PreTransferResponse;
    try {
      response = await fetchStandardJson<PreTransferResponse>(
        `/api/mint/${accountId}/${date}/${position}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attributes),
        }
      );
    } catch (err) {
      console.error("Claim request failed:", err);
      updateStatus(MintStatusDisplayText.LockNotAcquired);
      // Can't tell if a claim landed before the failure - release
      // defensively (serial in the URL is unused by the abort route when
      // there's nothing to release). Revalidate performance afterward so
      // MintStatusIndicator doesn't keep showing a stale lockedBy.
      try {
        await fetchStandardJson(
          `/api/mint/${accountId}/${date}/${position}/0/abort`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "SYSTEM_FAILURE" }),
          }
        );
      } catch (abortErr) {
        console.error("Cleanup abort request failed:", abortErr);
      }
      mutatePerformance();
      return;
    }

    const { serial, txBytes, lockedAt } = response;

    if (!txBytes) {
      // No client-side audit write here - whichever of these failed
      // already has its own server-side audit entry.
      switch (serial) {
        case SerialErrorResponse.LOCK_NOT_ACQUIRED:
          updateStatus(MintStatusDisplayText.LockNotAcquired);
          break;
        case SerialErrorResponse.ALREADY_MINTED:
          updateStatus(MintStatusDisplayText.AlreadyMinted);
          break;
        case SerialErrorResponse.NO_SUPPLY:
          updateStatus(MintStatusDisplayText.NoSupply);
          break;
        case SerialErrorResponse.TOO_MANY_LOCKED:
          updateStatus(MintStatusDisplayText.TooManyLocked);
          break;
        case SerialErrorResponse.METADATA_PUBLISH_FAILED:
          updateStatus(MintStatusDisplayText.MetadataPublishFailed);
          break;
        default:
          updateStatus(MintStatusDisplayText.LockNotAcquired);
          break;
      }
      await fetchStandardJson(
        `/api/mint/${accountId}/${date}/${position}/${serial}/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "SYSTEM_FAILURE" }),
        }
      );
      mutatePerformance();
      return;
    }

    setPreparedTx({ serial, txBytes, lockedAt });
    // Revalidate now, the earliest point the client can honestly know the
    // lock landed, rather than leaving MintStatusIndicator stale until
    // signAndFinalize finishes.
    mutatePerformance();
    await signAndFinalize({ serial, txBytes, lockedAt });
  };

  // Formerly its own click handler (handleSignClick, "Confirm in
  // Wallet") - now called automatically from handleClaimClick (Finding 51).
  const signAndFinalize = async ({ serial, txBytes }: PreparedTransfer) => {
    updateStatus(MintStatusDisplayText.InitiatingTransfer);
    setWalletWaitTimedOut(false);
    walletWaitTimeoutRef.current = setTimeout(
      () => setWalletWaitTimedOut(true),
      WALLET_WAIT_HINT_DELAY_MS
    );

    let transferSuccess = false;
    try {
      const nftId = new NftId(TokenId.fromString(hfbCollectionId), serial);
      const tx = TransferTransaction.fromBytes(new Uint8Array(txBytes.data));
      transferSuccess = await walletInterface!.purchaseNft(
        tx,
        nftId,
        date,
        parseInt(position)
      );
    } catch (err) {
      console.error("Transaction error:", err);
    } finally {
      // The wait is over either way (resolved, however it resolved) - stop
      // the hint timer and hide the hint if it had already fired.
      if (walletWaitTimeoutRef.current) {
        clearTimeout(walletWaitTimeoutRef.current);
        walletWaitTimeoutRef.current = null;
      }
      setWalletWaitTimedOut(false);
    }

    // User already released this claim while we were waiting - don't
    // overwrite UI state they've already moved past.
    if (releasedWhilePendingRef.current) {
      releasedWhilePendingRef.current = false;
      if (transferSuccess) {
        // Rare race: transfer succeeded moments after release. Not shown
        // to the user - just a best-effort finalize attempt (the
        // post-transfer route's own claim-match check decides if it's
        // safe); if it can't land, the orphaned NFT is manual-reconciliation
        // territory, same as a tab closing mid-flow.
        console.warn("Wallet transfer succeeded after the claim was already released.", { date, position, serial });
        fetchStandardJson<boolean>(
          `/api/mint/${accountId}/${date}/${position}/${serial}`,
          { method: "POST" }
        ).catch((err) => console.error("Best-effort finalize after late release failed:", err));
      }
      return;
    }

    if (!transferSuccess) {
      updateStatus(MintStatusDisplayText.TransferAborted);
      setPreparedTx(null);
      // Best-effort - UI's already reset above, so a failure here just
      // falls back to the 15-minute sweep instead of stranding anything.
      try {
        await fetchStandardJson(
          `/api/mint/${accountId}/${date}/${position}/${serial}/abort`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "WALLET_REJECTED" }),
          }
        );
      } catch (err) {
        console.error("Cleanup abort request failed:", err);
      }
      mutatePerformance();
      return;
    }

    updateStatus(MintStatusDisplayText.UpdatingMetadata);
    // Same missing-try/catch risk as the claim fetch (Finding 31), worse
    // here since the wallet's already signed and paid.
    let metadataUpdateSuccess = false;
    try {
      metadataUpdateSuccess = await fetchStandardJson<boolean>(
        `/api/mint/${accountId}/${date}/${position}/${serial}`,
        { method: "POST" }
      );
    } catch (err) {
      console.error("Metadata update request failed:", err);
    }

    setPreparedTx(null);
    // performance (SWR) doesn't update on its own just because preparedTx
    // did - without this, MintStatusIndicator stayed stuck on stale data.
    mutatePerformance();
    updateStatus(
      metadataUpdateSuccess
        ? MintStatusDisplayText.MintComplete
        : MintStatusDisplayText.FailedToUpdateMetadata
    );
  };

  const getImage = (): React.ReactNode => {
    if (metadataLoading || !showImageAttributes) {
      return (
        <div className="w-[374px] h-[374px] relative">
          <Loading sizeInPixels={90} />
        </div>
      );
    }
    return metadata ? (
      <Image
        src={ipfsToHttps(metadata.image, process.env.NEXT_PUBLIC_PINATA_GATEWAY)}
        alt={metadata.name}
        width={374}
        height={374}
        className="shadow-lg cursor-default rounded-2xl border border-gray-dark w-auto h-auto"
        priority
      />
    ) : (
      <NFTPlaceholder
        song={attributes.song || "Loading..."}
        performanceId={attributes.performanceId || ""}
        bgColor={bgColor || DolColorHex.Dark}
        donut={donut}
        subject={subject}
      />
    );
  };

  // Elapsed time, not a countdown - the sweep runs on its own schedule
  // (~15m), so an exact "frees up in Xm" promise could visibly overshoot.
  // Keep "~15m" in sync with reconcile-claims.js's EXPIRY_MINUTES.
  const getLockedForNote = (lockedAt?: number): React.ReactNode => {
    if (!lockedAt) return null;
    return (
      <div className="text-xs text-gray-medium">
        Locked for {msToTime(now - lockedAt)} · auto-releases within ~15m if abandoned
      </div>
    );
  };

  const getMintButton = (): React.ReactNode => {
    if (performanceLoading || isAssociatedLoading || accountStatusLoading) {
      return <DolButton color="gray" roundedFull disabled>Please Wait...</DolButton>;
    }
    if (!accountId) {
      return (
        <DolButton color="blue" roundedFull onClick={handleConnectClick}>Connect your wallet</DolButton>
      );
    }
    if (!isAssociated) {
      return (
        <div className="flex flex-col items-center gap-2">
          <DolButton color="blue" roundedFull onClick={handleAssociateClick}>Associate the token</DolButton>
          {associateError && (
            <div className="text-xs text-dol-red text-center">
              Failed to associate token. Please try again.
            </div>
          )}
        </div>
      );
    }
    if (preparedTx) {
      // Gated on walletWaitTimedOut so a normal-speed approval never sees
      // it, and it naturally excludes UpdatingMetadata (that flag's
      // already reset by then) - by then the transfer's a known success,
      // nothing left to release.
      const canRelease = walletWaitTimedOut;
      return (
        <div className="flex flex-col items-center gap-2">
          <DolButton color="blue" roundedFull disabled>
            {status === MintStatusDisplayText.UpdatingMetadata
              ? "Updating Metadata..."
              : "Waiting for Your Wallet..."}
          </DolButton>
          {canRelease && (
            <>
              <div className="text-xs text-gray-medium text-center max-w-[280px]">
                Still waiting on your wallet - it may have opened in another window or tab. Check for it there.
              </div>
              <DolButton
                size="sm"
                color="red"
                outline
                roundedFull
                onClick={handleReleaseClick}
                disabled={releasingClaim}
              >
                {releasingClaim ? "Releasing..." : "Release"}
              </DolButton>
            </>
          )}
          {getLockedForNote(preparedTx.lockedAt)}
        </div>
      );
    }
    if (performance?.serial) {
      return (
        <DolButton color="gray" roundedFull disabled>Already Minted</DolButton>
      );
    }
    if (performance?.lockedBy) {
      // Only for your own lock - releasing someone else's is still
      // admin-script territory.
      const isOwnLock = performance.lockedBy === accountId;
      return (
        <div className="flex flex-col items-center gap-2">
          <DolButton color="gray" roundedFull disabled>Locked</DolButton>
          {isOwnLock && (
            <DolButton
              size="sm"
              color="red"
              outline
              roundedFull
              onClick={handleReleaseClick}
              disabled={releasingClaim}
            >
              {releasingClaim ? "Releasing..." : "Release"}
            </DolButton>
          )}
          {getLockedForNote(performance.lockedAt)}
        </div>
      );
    }
    if (blocked) {
      // What a blocked user is told beyond this is still an open
      // question (no "request review" channel exists yet).
      return (
        <DolButton color="gray" roundedFull disabled>Minting Unavailable</DolButton>
      );
    }
    if (!mintEnabled && !whitelisted) {
      return (
        <DolButton color="gray" roundedFull disabled>Public Mint: TBA</DolButton>
      );
    }
    const disabled =
      blocked ||
      (!mintEnabled && !whitelisted) ||
      !Boolean(performance) ||
      [
        MintStatusDisplayText.Claiming,
        MintStatusDisplayText.AlreadyMinted,
        MintStatusDisplayText.InitiatingTransfer,
        MintStatusDisplayText.UpdatingMetadata,
        MintStatusDisplayText.MintComplete,
      ].includes(status);
    return (
      <DolButton
        color="blue"
        roundedFull
        onClick={handleClaimClick}
        disabled={disabled}
      >
        Mint: {`${process.env.NEXT_PUBLIC_HFB_HBAR_PRICE || "46"}`} ℏ
      </DolButton>
    );
  };

  const getStatusText = (): React.ReactNode => {
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

  const getPageNote = (): React.ReactNode => {
    if (!performance || performance?.serial || performance?.lockedBy) {
      return null;
    }

    if (blocked) {
      return (
        <PageNote color="red" className="text-center">
          Minting is currently unavailable for this account.
        </PageNote>
      );
    }

    // "Early access" only reads true pre-launch - not if the sale's since
    // been paused/ended/sold out, even though canMint doesn't distinguish
    // those cases server-side.
    if (collectionMintStatus === CollectionMintStatus.PRE && whitelisted) {
      return (
        <PageNote color="green" className="text-center">
          {CollectionMintStatusDisplayText.PRE} But I saw you with a Ticket Stub in your hand, so you&apos;re allowed in early!
        </PageNote>
      );
    }

    if (collectionMintStatus && collectionMintStatus !== CollectionMintStatus.ACTIVE) {
      return (
        <PageNote color="red" className="text-center">
          {CollectionMintStatusDisplayText[collectionMintStatus]}
        </PageNote>
      );
    }

    const getAttributeTypeLabel = (text: string, className?: string) =>
      <span className={twMerge("font-bold", className)}>{text}</span>;

    const customizable = getAttributeTypeLabel("Customizable", "text-dol-yellow");
    const fixed = getAttributeTypeLabel("Fixed", "text-dol-blue");
    const dynamic = getAttributeTypeLabel("Dynamic", "text-dol-green");
    const other = getAttributeTypeLabel("Other", "text-gray-medium");

    return (
      <div className="text-justify">
        Feel free to modify or randomize the {customizable} attributes to your liking! When you mint,{" "}
        they&apos;ll be written to the NFT&apos;s metadata on chain, along with the {fixed} attributes{" "}
        — <em>including the MP3 link!</em> ({dynamic} and {other} attributes will not be written on chain,{" "}
        but can still be viewed on this page.)
      </div>
    );
  };

  if (setlistLoading) {
    return <Loading sizeInPixels={90} showLyric />;
  }

  const formattedSetlist = getSetlistLines(setlists, parseInt(position))
    .map((s: SetlistLine) => (s.isCurrentPosition ? `${boldIndicator}${s.text}` : s.text))
    .join("\n");

  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] mt-4 mx-auto flex flex-col">
      <div className="flex flex-col items-center gap-4 w-full">
        {getPageNote()}
        <MintStatusBanner
          performance={performance}
          loading={performanceLoading}
          className="max-w-[374px]"
        />
        {getImage()}
        {getMintButton()}
        {getStatusText()}
      </div>

      {showImageAttributes && (
        <SectionHeader
          text="Customizable NFT Attributes"
          borderClass="border-dol-yellow"
          backgroundClass="bg-dol-yellow/25"
        />
      )}

      {showImageAttributes && (
        <ImageAttributes
          bgColor={bgColor}
          donut={donut}
          subject={subject}
          minted={Boolean(performance?.serial)}
          handleBgColorChanged={handleBgColorChanged}
          handleDonutChanged={handleDonutChanged}
          handleSubjectChanged={handleSubjectChanged}
          handleRandomizeClick={handleRandomizeClick}
          handleRandomizeKeyDown={handleRandomizeKeyDown}
        />
      )}

      <SectionHeader
        text="Fixed NFT Attributes"
        borderClass="border-dol-blue"
        backgroundClass="bg-dol-blue/25"
      />

      <FixedAttributes
        attributes={attributes}
        trackLoading={trackLoading}
        setlistLoading={setlistLoading}
        setlistsLoading={setlistsLoading}
        songLoading={songLoading}
        song={song}
      />

      <SectionHeader
        text="Dynamic Attributes"
        borderClass="border-dol-green"
        backgroundClass="bg-dol-green/25"
      />

      <DynamicAttributes song={song} songLoading={songLoading} />

      <SectionHeader
        text="Other Attributes"
        borderClass="border-gray-medium"
        backgroundClass="bg-gray-dark/75"
      />

      <OtherAttributes
        setlist={setlist}
        setlistLoading={setlistLoading}
        formattedSetlist={formattedSetlist}
        setlistsLoading={setlistsLoading}
        song={song}
        songLoading={songLoading}
      />

      <SectionHeader
        text="Audit Logs"
        borderClass="border-gray-medium"
        backgroundClass="bg-dol-dark"
      />

      <AuditLogsAttribute setlist={setlist} setlistLoading={setlistLoading} />
    </div>
  );
};
