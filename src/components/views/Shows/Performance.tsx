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
import { MintStatusIndicator } from "@/components/common/MintStatusIndicator";
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
// time we ever set preparedTx, serial/txBytes are always populated
// together. lockedAt carries over too, so the elapsed-lock note can show
// immediately (see PUNCHLIST.md's immediate-timer follow-up) instead of
// only appearing after a reload re-fetches performance.lockedAt from SWR.
type PreparedTransfer = {
  serial: number;
  txBytes: Uint8ArrayWrapper;
  lockedAt?: number;
};

// PUNCHLIST.md Finding 50: the pre-transfer route does claim + render + two
// sequential IPFS uploads + an on-chain metadata update in one request/
// response - it's not streaming, so the client has no way to know when each
// real step finishes, only that the whole thing is still in flight. This is
// an approximate, client-side-only sequence, not a true progress readout
// tied to the server's actual step boundaries (that would need the API
// route itself to stream - a bigger change, parked as Finding 51's
// "decoupled" architecture idea covers similar ground). Ordered to roughly
// match the route's real steps and deliberately stops advancing at the last
// message instead of looping, so a slow cold render reads as "still going"
// rather than "stuck in a loop."
const CLAIM_PROGRESS_STEPS = [
  MintStatusDisplayText.Claiming,
  "Rendering your NFT image...",
  "Uploading to IPFS...",
  "Finalizing on-chain metadata...",
  "Almost there...",
] as const;
const CLAIM_PROGRESS_STEP_INTERVAL_MS = 4000;

// PUNCHLIST.md Finding 51: how long to wait for the wallet to respond
// before showing a passive hint that it may have opened in another window.
// Deliberately not a retry/cancel trigger - see the finding's writeup for
// why (no reliable way to tell "never got the request" from "pending, not
// yet approved" from here, so a second wallet call risks a double
// submission of the same transaction). Was 6000 originally, dropped to
// 2000 2026-08-17 after live testing showed the wallet reliably grabbing
// focus in well under a second - long enough to stay past a normal fast
// approval (no flicker on the path that's actually working), short enough
// to cut down how long a genuinely stuck user sits looking at an
// unexplained disabled button.
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
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showImageAttributes, setShowImageAttributes] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  // Set once handleClaimClick's server round-trip finishes and cleared once
  // signAndFinalize resolves - the "am I mid-flow" signal getMintButton
  // uses to show "Waiting for Your Wallet..." instead of the generic
  // "Locked" state. As of Finding 51, this window is no longer a pause
  // waiting on a second click - signAndFinalize fires automatically.
  const [preparedTx, setPreparedTx] = useState<PreparedTransfer | null>(null);
  // Which message in CLAIM_PROGRESS_STEPS to show - see Finding 50's note
  // above CLAIM_PROGRESS_STEPS for why this is approximate/client-side only.
  const [claimProgressStep, setClaimProgressStep] = useState(0);
  // Whether to show Finding 51's passive "check for another window" hint -
  // see WALLET_WAIT_HINT_DELAY_MS above for why this is display-only, no
  // retry action attached.
  const [walletWaitTimedOut, setWalletWaitTimedOut] = useState(false);
  const walletWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // See PUNCHLIST.md Finding 28 - live from dol-app-config (the soft kill
  // switch) via SWR, not the old build-time NEXT_PUBLIC_MINT_ENABLED env
  // var. Undefined while loading defaults to false, same fail-closed
  // default the route side already uses.
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

  // Advances the Finding 50 progress message while the claim/prepare
  // request is in flight, resetting once it resolves (success or failure -
  // status always moves off Claiming either way) so the next attempt starts
  // from the first message again.
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
    if (e.key === "Enter") randomizeAttributes();
  }, []);

  const handleRandomizeClick = useCallback(() => {
    randomizeAttributes();
  }, []);

  const handleConnectClick = async () => {
    openWalletConnectModal();
  };

  const handleAssociateClick = async () => {
    const success = await walletInterface?.associateToken(hfbCollectionId);
    if (success) {
      mutateIsAssociated(true);
    }
  };

  const updateStatus = (newStatus: MintStatusDisplayText) => {
    setStatus(newStatus);
    console.log(newStatus);
  };

  // PUNCHLIST.md Finding 51: this used to require a second, separate click
  // (handleSignClick) after this claim/prepare step, specifically because
  // browsers only reliably let a wallet popup open/focus without being
  // blocked when it happens from a fresh, direct user gesture - the
  // claim+render+upload round-trip here broke that chain, so HashPack's
  // window had to be found and switched to manually instead of coming to
  // the front on its own (see Phase 7's history for the original incident).
  // As of Finding 51, signAndFinalize now fires automatically once this
  // resolves, no second click required - but that's a deliberate bet, not
  // a confirmed fix: firing from here is not a fresh gesture either (it's
  // code continuing after this same multi-second await), so it may not
  // reliably avoid the original focus problem. The passive "check for
  // another window" hint in getMintButton is the safety net for when it
  // doesn't; needs a real testnet mint to know how often that hint actually
  // shows up in practice.
  const handleClaimClick = async () => {
    if (!pageLoaded || !setlist) {
      return;
    }
    if (performance?.serial) {
      updateStatus(MintStatusDisplayText.AlreadyMinted);
      return;
    }

    updateStatus(MintStatusDisplayText.Claiming);

    // PUNCHLIST.md Finding 31: this used to be a bare `await` with no
    // try/catch. `fetchStandardJson` throws on any non-ok response (a real
    // server error, not one of the modeled SerialErrorResponse cases the
    // switch below handles), and status was already set to Claiming above -
    // an uncaught throw here left the button disabled forever with no
    // feedback and no way to retry short of a reload.
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
      // We can't tell from here whether a claim actually landed
      // server-side before the failure - release defensively, same as the
      // known-failure cases below (the serial in the URL is unused by the
      // abort route when there's no real claim to speak of). Swallow any
      // error from the cleanup attempt itself so a failed abort can't
      // re-stick the UI right after we just unstuck it.
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
      // PUNCHLIST.md's mint-flow-staleness fix: the claim may have been
      // released server-side just above - revalidate rather than leaving
      // this tab's cached performance (and MintStatusIndicator, which
      // shares it) showing a stale lockedBy.
      mutatePerformance();
      return;
    }

    const { serial, txBytes, lockedAt } = response;

    if (!txBytes) {
      // No client-side audit write here: whichever of these failed
      // (claim, or a claim that got released again after a metadata
      // publish failure) already has its own server-side audit entry -
      // PERFORMANCE_CLAIM/SERIAL_CLAIM/NFT_METADATA_PUBLISH, all
      // success: false, keyed to this account. By the time we'd report
      // an NFT_PURCHASE failure here, there's no live claim left to
      // verify it against anyway (see PUNCHLIST.md Finding 14) - it
      // would just be rejected.
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
    // The claim genuinely just succeeded server-side - revalidate now
    // rather than leaving MintStatusIndicator (and the mint button's own
    // "Locked" fallback) showing stale pre-claim data through the entire
    // wallet-wait phase too, only catching up once signAndFinalize's own
    // mutatePerformance calls fire at the very end. This is the earliest
    // point the client can honestly know the lock landed - the pre-transfer
    // route is one non-streaming request, so there's no earlier signal to
    // act on (claimPerformance runs first server-side, well before the
    // render/upload/on-chain-update work the rest of this request does, but
    // nothing is observable client-side until the whole request resolves).
    mutatePerformance();
    // No second click here as of Finding 51 - see the comment above this
    // function for the honest caveat on whether this reliably preserves a
    // "fresh gesture" the way the old separate click did.
    await signAndFinalize({ serial, txBytes, lockedAt });
  };

  // Split out from handleClaimClick so both the auto-continue above and
  // (were it ever needed again) a manual retry could share one
  // implementation. Previously this was handleSignClick, its own click
  // handler fired by a separate "Confirm in Wallet" button - see
  // PUNCHLIST.md Finding 51.
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

    if (!transferSuccess) {
      updateStatus(MintStatusDisplayText.TransferAborted);
      setPreparedTx(null);
      // Best-effort cleanup only - status/preparedTx are already reset
      // above, so a failure here doesn't strand the UI the way Finding 31's
      // two spots did. Still wrapped so a failed cleanup attempt doesn't
      // surface as an unhandled rejection; the claim (if any was still
      // live) falls back to Finding 18's 15-minute sweep either way.
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
      // See the mutatePerformance note below - same staleness fix, this is
      // the wallet-rejected/failed-transfer exit instead of the success one.
      mutatePerformance();
      return;
    }

    updateStatus(MintStatusDisplayText.UpdatingMetadata);
    // PUNCHLIST.md Finding 31: same missing-try/catch shape as the claim
    // request above, but worse here - the buyer's wallet has already signed
    // and paid by this point. An uncaught throw left the button stuck on
    // "Updating metadata..." forever with no indication anything had gone
    // wrong, let alone that the transfer itself had already succeeded.
    // Treated the same as a modeled `false` result below, which already has
    // the right copy for this exact situation ("Transfer complete, but
    // failed to update metadata.").
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
    // Found live 2026-08-17: after a real successful mint, the status text
    // correctly updated ("Mint complete!"), but MintStatusIndicator and the
    // mint button's own "Locked" fallback both stayed stuck showing the
    // pre-mint state - they read `performance` (SWR-cached), and nothing
    // told SWR the server-side lockedBy/serial had just changed underneath
    // it. `preparedTx` going null is local React state, so it updates
    // instantly; `performance` doesn't, until this. Revalidating here
    // (success or failure - either way the server-side state just changed)
    // is what makes "the rest of the view" catch up immediately instead of
    // waiting on SWR's own polling/focus-revalidation to eventually notice.
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
        <div className="w-[374px] h-[420px] relative">
          <Loading sizeInPixels={90} />
        </div>
      );
    }
    return metadata ? (
      <Image
        src={ipfsToHttps(metadata.image, process.env.NEXT_PUBLIC_PINATA_GATEWAY)}
        alt={metadata.name}
        width={374}
        height={420}
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

  // Elapsed time, not a precise countdown - the sweep that releases stuck
  // claims runs on its own schedule (currently every 5m, releasing
  // anything over 15m old), so an exact "frees up in Xm" promise would
  // drift out of sync and could visibly overshoot. Keep this note's "~15m"
  // in sync with dol-bot's reconcile-claims.js EXPIRY_MINUTES if that ever
  // changes - see PUNCHLIST.md Finding 18. Shared between the "just
  // claimed it myself" (preparedTx) and "someone/something else has it
  // locked" (performance.lockedBy) states, so it shows immediately after a
  // successful claim rather than only after a reload re-fetches
  // performance.lockedAt - see PUNCHLIST.md's immediate-timer follow-up.
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
        <DolButton color="blue" roundedFull onClick={handleAssociateClick}>Associate the token</DolButton>
      );
    }
    if (preparedTx) {
      // PUNCHLIST.md Finding 51 superseded Finding 32's original fix here:
      // signAndFinalize now fires automatically as soon as preparedTx is
      // set, so there's no longer a manual "Confirm in Wallet"/"Cancel"
      // pair to guard against double-clicking - there's nothing left for
      // the user to click at all while this is in flight, just a disabled
      // status button and (once WALLET_WAIT_HINT_DELAY_MS has passed with
      // no response) a passive hint. No "Cancel" option here deliberately -
      // see Finding 52: releaseClaim has no on-chain ownership check, so
      // canceling mid-wait risks releasing a claim that's already been
      // signed and paid for, the exact class of bug Finding 32 closed for
      // the old buttons.
      return (
        <div className="flex flex-col items-center gap-2">
          <DolButton color="blue" roundedFull disabled>
            {status === MintStatusDisplayText.UpdatingMetadata
              ? "Updating Metadata..."
              : "Waiting for Your Wallet..."}
          </DolButton>
          {walletWaitTimedOut && (
            <div className="text-xs text-gray-medium text-center max-w-[280px]">
              Still waiting on your wallet - it may have opened in another window or tab. Check for it there.
            </div>
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
      return (
        <div className="flex flex-col items-center gap-1">
          <DolButton color="gray" roundedFull disabled>Locked</DolButton>
          {getLockedForNote(performance.lockedAt)}
        </div>
      );
    }
    if (blocked) {
      // See PUNCHLIST.md Finding 27: what a blocked user is told beyond
      // this is still an open UX question (no "request review" channel
      // exists yet) - kept deliberately minimal for now rather than
      // building that flow speculatively.
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

    // Finding 50: while claiming/preparing, show the cycling progress
    // message (+ a small spinner, since this step alone can run long) in
    // place of the single static "Claiming performance..." text.
    if (status === MintStatusDisplayText.Claiming) {
      return (
        <div className="flex items-center gap-2 text-dol-yellow">
          <AnimatedDonut sizeInPixels={16} />
          <span>{CLAIM_PROGRESS_STEPS[claimProgressStep]}</span>
        </div>
      );
    }

    // MintStatusDisplayText.ReadyToSign is never set anymore as of Finding
    // 51 (signAndFinalize fires automatically, no in-between state to
    // announce) - not excluded here for that reason anymore, it just never
    // occurs.
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

    // Ticket Stub early access only reads true pre-launch - a whitelisted
    // account isn't "early" if the sale has already been paused, ended, or
    // sold out, even though today's canMint gate (Finding 27) doesn't
    // actually distinguish those cases server-side. Worth a look separately
    // - this note describes the honest state, not necessarily everything
    // the server would currently let a whitelisted account do.
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
    <div className="w-[320px] md:w-[500px] lg:w-[680px] mt-4 mx-auto flex flex-col">
      <div className="flex flex-col items-center gap-4 w-full">
        {getPageNote()}
        <MintStatusIndicator
          date={date}
          position={parsedPosition}
          performance={performance}
          className="justify-center text-md"
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
