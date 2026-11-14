"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/cafe/cafe.module.css";

const VIDEO_SRC = "/videos/cafe-entrance.mp4";
const POSTER_SRC = "/images/yo/mandarin/cafe.webp";

/**
 * Approved cinematic entrance when the video asset is present;
 * otherwise the existing café photograph remains the visual focus.
 */
export function CafeEntranceMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useVideo, setUseVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(VIDEO_SRC, { method: "HEAD" })
      .then((response) => {
        if (!cancelled && response.ok) setUseVideo(true);
      })
      .catch(() => {
        /* Keep the poster photograph. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !useVideo) return;
    void video.play().catch(() => {
      /* Autoplay may be blocked; poster still shows. */
    });
  }, [useVideo]);

  if (!useVideo) {
    return <div className={styles.cafePhoto} aria-hidden="true" />;
  }

  return (
    <div className={styles.cafeMedia} aria-hidden="true">
      <video
        ref={videoRef}
        className={styles.cafeVideo}
        poster={POSTER_SRC}
        src={VIDEO_SRC}
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
      />
    </div>
  );
}
