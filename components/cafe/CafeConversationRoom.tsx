"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import styles from "@/app/cafe/cafe.module.css";
import { cafeCopy, type CafeLocale } from "@/lib/cafe/copy";
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
  const callRef = useRef<{ destroy: () => void } | null>(null);
  const tokenRef = useRef<string | null>(null);
  const frameHostRef = useRef<HTMLDivElement | null>(null);
  const mediaPrefsRef = useRef({ cameraArmed: false, micArmed: false });

  useEffect(() => {
    mediaPrefsRef.current = { cameraArmed: state.cameraArmed, micArmed: state.micArmed };
  }, [state.cameraArmed, state.micArmed]);

  useEffect(() => {
    return () => {
      tokenRef.current = null;
      try {
        callRef.current?.destroy();
      } catch {
        // ignore teardown races
      }
      callRef.current = null;
    };
  }, []);

  async function enterLiveRoom() {
    if (!getAccessToken) {
      dispatch({ type: "join_failed", code: "demo_only" });
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      dispatch({ type: "join_failed", code: "access_denied" });
      return;
    }

    const joined = await requestCafeRoomJoin({ slug, accessToken });
    if (!joined.ok) {
      dispatch({ type: "join_failed", code: joined.code });
      return;
    }

    tokenRef.current = joined.token;
    try {
      const host = frameHostRef.current;
      if (!host) {
        dispatch({ type: "join_failed", code: "provider_unavailable" });
        return;
      }
      const DailyIframe = (await import("@daily-co/daily-js")).default;
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
      });
      callRef.current = call;
      call.on("left-meeting", () => {
        tokenRef.current = null;
        dispatch({ type: "leave" });
      });
      call.on("error", () => {
        dispatch({ type: "join_failed", code: "provider_unavailable" });
      });
      const prefs = mediaPrefsRef.current;
      await call.join({
        url: joined.roomUrl,
        token: joined.token,
        startVideoOff: !prefs.cameraArmed,
        startAudioOff: !prefs.micArmed,
      });
      dispatch({ type: "join_succeeded" });
    } catch {
      tokenRef.current = null;
      dispatch({ type: "join_failed", code: "provider_unavailable" });
    }
  }

  async function onJoin() {
    dispatch({ type: "request_join" });
    if (mode === "demo") {
      // Labeled demonstration only — never presents as a real Daily session.
      await new Promise((r) => setTimeout(r, 450));
      dispatch({ type: "join_succeeded" });
      return;
    }
    // Frame host must mount while phase === joining (live mode).
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await enterLiveRoom();
  }

  function onLeave() {
    tokenRef.current = null;
    try {
      callRef.current?.destroy();
    } catch {
      // ignore
    }
    callRef.current = null;
    dispatch({ type: "leave" });
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
                onClick={() => dispatch({ type: "start_media_prep" })}
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
