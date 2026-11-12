"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import styles from "@/app/cafe/cafe.module.css";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
import {
  CafeDailyJoinGeneration,
  destroyCafeDailyCall,
  type CafeDailyCallHandle,
} from "@/lib/cafe/dailyRoomSession";
import { requestCafeRoomJoin } from "@/lib/cafe/roomClient";
import {
  cafeRoomReduce,
  initialCafeRoomUiState,
  type CafeRoomMode,
} from "@/lib/cafe/roomUiState";

type Props = {
  locale?: CafeLocale;
  mode: CafeRoomMode;
  slug: string;
  sessionTitle: string;
  courseReturnHref: string | null;
  /** Live mode only — bearer from createBrowserClient. Never logged. */
  getAccessToken?: () => Promise<string | null>;
};

function errorMessage(copy: (typeof cafeCopy)[CafeLocale], code: string | null): string {
  switch (code) {
    case "too_early":
      return copy.roomTooEarly;
    case "not_reserved":
      return copy.roomNotReserved;
    case "ended":
    case "session_cancelled":
      return copy.roomEnded;
    case "provider_unavailable":
      return copy.roomProviderDown;
    case "network_error":
    case "response_lost":
      return copy.roomNetworkError;
    case "demo_only":
      return copy.roomDemoBlocked;
    default:
      return copy.roomJoinFailed;
  }
}

export function CafeConversationRoom({
  locale = "fr",
  mode,
  slug,
  sessionTitle,
  courseReturnHref,
  getAccessToken,
}: Props) {
  const copy = cafeCopy[locale];
  const [state, dispatch] = useReducer(cafeRoomReduce, mode, initialCafeRoomUiState);
  const callRef = useRef<CafeDailyCallHandle | null>(null);
  const tokenRef = useRef<string | null>(null);
  const frameHostRef = useRef<HTMLDivElement | null>(null);
  const mediaPrefsRef = useRef({ cameraArmed: false, micArmed: false });
  const joinGenRef = useRef(new CafeDailyJoinGeneration());

  useEffect(() => {
    mediaPrefsRef.current = { cameraArmed: state.cameraArmed, micArmed: state.micArmed };
  }, [state.cameraArmed, state.micArmed]);

  useEffect(() => {
    const joinGen = joinGenRef.current;
    return () => {
      joinGen.invalidate();
      tokenRef.current = null;
      callRef.current = destroyCafeDailyCall(callRef.current);
    };
  }, []);

  function cleanupDailyCall() {
    tokenRef.current = null;
    callRef.current = destroyCafeDailyCall(callRef.current);
  }

  async function enterLiveRoom(attempt: number) {
    if (!getAccessToken) {
      if (joinGenRef.current.isCurrent(attempt)) {
        dispatch({ type: "join_failed", code: "demo_only" });
      }
      return;
    }

    const accessToken = await getAccessToken();
    if (!joinGenRef.current.isCurrent(attempt)) return;
    if (!accessToken) {
      dispatch({ type: "join_failed", code: "access_denied" });
      return;
    }

    const joined = await requestCafeRoomJoin({ slug, accessToken });
    if (!joinGenRef.current.isCurrent(attempt)) {
      // Stale after leave/unmount — never keep a token around.
      return;
    }
    if (!joined.ok) {
      cleanupDailyCall();
      dispatch({ type: "join_failed", code: joined.code });
      return;
    }

    try {
      const host = frameHostRef.current;
      if (!host) {
        cleanupDailyCall();
        if (joinGenRef.current.isCurrent(attempt)) {
          dispatch({ type: "join_failed", code: "provider_unavailable" });
        }
        return;
      }

      // Destroy any leftover frame before creating a new one (retry path).
      cleanupDailyCall();
      if (!joinGenRef.current.isCurrent(attempt)) return;

      const DailyIframe = (await import("@daily-co/daily-js")).default;
      if (!joinGenRef.current.isCurrent(attempt)) return;

      const call = DailyIframe.createFrame(host, {
        showLeaveButton: false,
        showFullscreenButton: false,
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "20px",
          background: "#120f0d",
        },
      }) as CafeDailyCallHandle;

      callRef.current = call;
      tokenRef.current = joined.token;
      call.on?.("left-meeting", () => {
        if (!joinGenRef.current.isCurrent(attempt)) return;
        cleanupDailyCall();
        dispatch({ type: "leave" });
      });
      call.on?.("error", () => {
        if (!joinGenRef.current.isCurrent(attempt)) return;
        joinGenRef.current.invalidate();
        cleanupDailyCall();
        dispatch({ type: "join_failed", code: "provider_unavailable" });
      });

      const prefs = mediaPrefsRef.current;
      await call.join({
        url: joined.roomUrl,
        token: joined.token,
        startVideoOff: !prefs.cameraArmed,
        startAudioOff: !prefs.micArmed,
      });

      if (!joinGenRef.current.isCurrent(attempt)) {
        // Left/unmounted during join — tear down the late connection.
        cleanupDailyCall();
        return;
      }
      dispatch({ type: "join_succeeded" });
    } catch {
      cleanupDailyCall();
      if (joinGenRef.current.isCurrent(attempt)) {
        joinGenRef.current.invalidate();
        dispatch({ type: "join_failed", code: "provider_unavailable" });
      }
    }
  }

  async function onJoin() {
    // Invalidate any previous in-flight join before starting a new attempt.
    cleanupDailyCall();
    const attempt = joinGenRef.current.beginAttempt();
    dispatch({ type: "request_join" });

    if (mode === "demo") {
      // Labeled demonstration only — never presents as a real Daily session.
      await new Promise((r) => setTimeout(r, 450));
      if (!joinGenRef.current.isCurrent(attempt)) return;
      dispatch({ type: "join_succeeded" });
      return;
    }

    // Frame host must mount while phase === joining (live mode).
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    if (!joinGenRef.current.isCurrent(attempt)) return;
    await enterLiveRoom(attempt);
  }

  function onLeave() {
    joinGenRef.current.invalidate();
    cleanupDailyCall();
    dispatch({ type: "leave" });
  }

  function onRetry() {
    joinGenRef.current.invalidate();
    cleanupDailyCall();
    dispatch({ type: "start_media_prep" });
  }

  return (
    <main className={styles.shell} lang={locale}>
      <div className={styles.stage}>
        <div className={`${styles.panel} ${styles.roomPanel}`}>
          {mode === "demo" ? (
            <p className={styles.roomDemoBanner} role="status">
              {copy.roomDemoBanner}
            </p>
          ) : null}

          <p className={styles.eyebrow}>{copy.roomEyebrow}</p>
          <h1 className={styles.roomTitle}>{sessionTitle}</h1>
          <p className={styles.roomLead}>{copy.roomLead}</p>
          <p className={styles.roomNoCredit}>{copy.roomNoCredit}</p>

          {state.phase === "welcome" ? (
            <div className={styles.roomActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => dispatch({ type: "start_media_prep" })}
              >
                {copy.roomPrepare}
              </button>
              {courseReturnHref ? (
                <Link className={styles.secondaryButton} href={courseReturnHref}>
                  {copy.returnToCourse}
                </Link>
              ) : null}
            </div>
          ) : null}

          {state.phase === "media_prep" ? (
            <div className={styles.roomPrep}>
              <p className={styles.roomPrepHint}>{copy.roomPrepHint}</p>
              <div className={styles.roomToggleRow}>
                <button
                  type="button"
                  className={state.cameraArmed ? styles.roomToggleOn : styles.roomToggleOff}
                  onClick={() => dispatch({ type: "toggle_camera" })}
                  aria-pressed={state.cameraArmed}
                >
                  {state.cameraArmed ? copy.roomCameraOn : copy.roomCameraOff}
                </button>
                <button
                  type="button"
                  className={state.micArmed ? styles.roomToggleOn : styles.roomToggleOff}
                  onClick={() => dispatch({ type: "toggle_mic" })}
                  aria-pressed={state.micArmed}
                >
                  {state.micArmed ? copy.roomMicOn : copy.roomMicOff}
                </button>
              </div>
              <div className={styles.roomActions}>
                <button type="button" className={styles.primaryButton} onClick={() => void onJoin()}>
                  {copy.roomEnter}
                </button>
              </div>
            </div>
          ) : null}

          {state.phase === "joining"
          || state.phase === "connected"
          || state.phase === "reconnecting" ? (
            <div className={styles.roomLive}>
              {state.phase === "joining" ? (
                <p className={styles.reservationNote} role="status">{copy.roomJoining}</p>
              ) : null}
              {mode === "demo" && state.phase !== "joining" ? (
                <div className={styles.roomDemoStage} role="status">
                  <p>{copy.roomDemoConnected}</p>
                  <p className={styles.roomPrepHint}>
                    {state.cameraArmed ? copy.roomCameraOn : copy.roomCameraOff}
                    {" · "}
                    {state.micArmed ? copy.roomMicOn : copy.roomMicOff}
                  </p>
                </div>
              ) : null}
              {mode === "live" ? (
                <div
                  ref={frameHostRef}
                  className={styles.roomFrameHost}
                  data-cafe-daily-frame="true"
                />
              ) : null}
              {state.phase === "reconnecting" ? (
                <p className={styles.reservationNote} role="status">{copy.roomReconnecting}</p>
              ) : null}
              {state.phase === "connected" || state.phase === "reconnecting" ? (
                <div className={styles.roomActions}>
                  <button type="button" className={styles.secondaryButton} onClick={onLeave}>
                    {copy.roomLeave}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {state.phase === "error" ? (
            <div className={styles.roomActions}>
              <p className={styles.reservationNote} role="alert">
                {errorMessage(copy, state.errorCode)}
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onRetry}
              >
                {copy.roomRetry}
              </button>
              {courseReturnHref ? (
                <Link className={styles.secondaryButton} href={courseReturnHref}>
                  {copy.returnToCourse}
                </Link>
              ) : null}
            </div>
          ) : null}

          {state.phase === "left" ? (
            <div className={styles.roomActions}>
              <p className={styles.reservationNote} role="status">{copy.roomLeft}</p>
              {courseReturnHref ? (
                <Link className={styles.primaryButton} href={courseReturnHref}>
                  {copy.returnToCourse}
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => dispatch({ type: "return_welcome" })}
                >
                  {copy.roomPrepare}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
