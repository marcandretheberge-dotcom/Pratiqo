"use client";

import { useEffect, useRef } from "react";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { readOAuthReturnIntent } from "@/lib/auth/oauthReturnHandoff";
import { resumeOAuthCallback } from "@/lib/auth/productOAuthAttempt";

export default function ResumeSignInPage() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const target = resumeOAuthCallback(fragment, readOAuthReturnIntent());
    window.location.replace(target);
  }, []);
  return <AppLoadingFallback />;
}
