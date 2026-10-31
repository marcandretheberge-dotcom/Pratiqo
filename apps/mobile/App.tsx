import "react-native-url-polyfill/auto";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import type { Session } from "@supabase/supabase-js";

import {
  AUTH_REDIRECT_URI,
  isBlockedNativePurchase,
  isPratiqoWebUrl,
  webUrl,
} from "./src/config";
import { getMobileSupabase } from "./src/supabase";

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = "google" | "apple";

type BridgeMessage =
  | { type: "bridge.ready"; version?: number }
  | {
      type: "auth.oauth";
      provider: OAuthProvider;
      intent?: "learner" | "teacher" | null;
      forceAccountSelection?: boolean;
    }
  | { type: "auth.logout" }
  | { type: "auth.web-session-error"; message?: string };

const NAV_ITEMS = [
  { label: "Accueil", glyph: "⌂", path: "/" },
  { label: "Profs", glyph: "⌕", path: "/trouver-un-prof" },
  { label: "Yo", glyph: "✦", path: "/yo" },
  { label: "Compte", glyph: "●", path: "/connexion" },
] as const;

function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const value = JSON.parse(raw) as BridgeMessage;
    return value && typeof value.type === "string" ? value : null;
  } catch {
    return null;
  }
}

function sessionScript(session: Session, intent?: "learner" | "teacher" | null): string {
  const detail = JSON.stringify({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    intent: intent ?? null,
  });
  return `window.dispatchEvent(new CustomEvent("pratiqo:native-auth-session",{detail:${detail}}));true;`;
}

function injectedBootstrap(): string {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  return `
    (function () {
      window.__PRATIQO_NATIVE_PLATFORM__ = "${platform}";
      window.__PRATIQO_NATIVE_APP__ = true;
      document.documentElement.dataset.pratiqoNativeApp = "true";
      document.documentElement.dataset.pratiqoNativePlatform = "${platform}";
      var style = document.createElement("style");
      style.id = "pratiqo-native-store-guard";
      style.textContent =
        'a[href^="/upgrade"],a[href*="/yo/checkout"],a[href*="/api/stripe/pro/checkout"]{display:none!important}';
      (document.head || document.documentElement).appendChild(style);
    })();
    true;
  `;
}

function deepLinkToWeb(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && isPratiqoWebUrl(url)) return url;
    if (parsed.protocol !== "pratiqo:") return null;
    if (parsed.hostname === "auth") return null;
    if (parsed.hostname === "open") {
      const path = parsed.searchParams.get("path");
      return path?.startsWith("/") ? webUrl(path) : webUrl("/");
    }
    const path = "/" + [parsed.hostname, parsed.pathname.replace(/^\//, "")].filter(Boolean).join("/");
    return webUrl(path);
  } catch {
    return null;
  }
}

function NativeShell() {
  const webViewRef = useRef<WebView>(null);
  const [uri, setUri] = useState(webUrl("/"));
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(uri);
  const [webFailed, setWebFailed] = useState(false);
  const authBusy = useRef(false);

  const injectSession = useCallback(
    (session: Session, intent?: "learner" | "teacher" | null) => {
      webViewRef.current?.injectJavaScript(sessionScript(session, intent));
    },
    [],
  );

  const performOAuth = useCallback(
    async (provider: OAuthProvider, intent?: "learner" | "teacher" | null, forceAccountSelection?: boolean) => {
      if (authBusy.current) return;
      const supabase = getMobileSupabase();
      if (!supabase) {
        Alert.alert(
          "Configuration requise",
          "Les variables publiques Supabase de l’app mobile ne sont pas encore configurées.",
        );
        return;
      }

      authBusy.current = true;
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: AUTH_REDIRECT_URI,
            skipBrowserRedirect: true,
            ...(provider === "google" && forceAccountSelection
              ? { queryParams: { prompt: "select_account" } }
              : {}),
          },
        });
        if (error || !data.url) throw error ?? new Error("OAuth URL missing");

        const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT_URI);
        if (result.type !== "success" || !result.url) return;

        const parsed = new URL(result.url);
        const code = parsed.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const normalized = new URL(result.url.replace("#", "?"));
          const accessToken = normalized.searchParams.get("access_token");
          const refreshToken = normalized.searchParams.get("refresh_token");
          if (!accessToken || !refreshToken) throw new Error("OAuth session missing");
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setError) throw setError;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("OAuth completed without a session");
        injectSession(session, intent);
      } catch (error) {
        console.error("[mobile] OAuth failed", error);
        Alert.alert("Connexion impossible", "La connexion n’a pas pu être terminée. Réessaie.");
      } finally {
        authBusy.current = false;
      }
    },
    [injectSession],
  );

  const handleBridgeMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const message = parseBridgeMessage(event.nativeEvent.data);
      if (!message) return;

      if (message.type === "bridge.ready") {
        const supabase = getMobileSupabase();
        if (!supabase) return;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) injectSession(session);
        return;
      }

      if (message.type === "auth.oauth") {
        await performOAuth(message.provider, message.intent, message.forceAccountSelection);
        return;
      }

      if (message.type === "auth.logout") {
        await getMobileSupabase()?.auth.signOut();
        return;
      }

      if (message.type === "auth.web-session-error") {
        Alert.alert("Connexion", "La session mobile n’a pas pu être transmise au site.");
      }
    },
    [injectSession, performOAuth],
  );

  const openExternal = useCallback(async (url: string) => {
    if (url.startsWith("mailto:") || url.startsWith("tel:")) {
      await Linking.openURL(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const shouldStart = useCallback(
    (request: { url: string }) => {
      const nextUrl = request.url;
      if (isBlockedNativePurchase(nextUrl)) {
        Alert.alert(
          "Achat non disponible dans l’app",
          "Cet achat numérique n’est pas offert dans l’app mobile pour le moment.",
        );
        return false;
      }
      if (isPratiqoWebUrl(nextUrl)) return true;
      if (nextUrl.startsWith("about:blank")) return true;
      if (nextUrl.startsWith("pratiqo:")) return false;
      void openExternal(nextUrl);
      return false;
    },
    [openExternal],
  );

  const navigate = useCallback((path: string) => {
    const target = webUrl(path);
    setCurrentUrl(target);
    webViewRef.current?.injectJavaScript(
      `window.location.assign(${JSON.stringify(target)});true;`,
    );
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const target = deepLinkToWeb(url);
      if (target) setUri(target);
    };
    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const supabase = getMobileSupabase();
    if (!supabase) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, []);

  const bootstrap = useMemo(injectedBootstrap, []);

  const navigationChanged = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    setCurrentUrl(nav.url);
    setWebFailed(false);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri }}
          style={styles.webView}
          originWhitelist={["https://*", "pratiqo://*"]}
          injectedJavaScriptBeforeContentLoaded={bootstrap}
          onMessage={handleBridgeMessage}
          onShouldStartLoadWithRequest={shouldStart}
          onNavigationStateChange={navigationChanged}
          onError={() => setWebFailed(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500) setWebFailed(true);
          }}
          onContentProcessDidTerminate={() => webViewRef.current?.reload()}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          applicationNameForUserAgent="PratiqoMobile/1.0"
        />
        {webFailed ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Pratiqo est momentanément inaccessible.</Text>
            <Pressable style={styles.retryButton} onPress={() => webViewRef.current?.reload()}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.tabBar}>
          {NAV_ITEMS.map((item) => {
            const selected =
              item.path === "/"
                ? currentUrl === webUrl("/")
                : currentUrl.startsWith(webUrl(item.path));
            return (
              <Pressable
                key={item.path}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => navigate(item.path)}
                style={styles.tab}
              >
                <Text style={[styles.tabGlyph, selected && styles.tabSelected]}>{item.glyph}</Text>
                <Text style={[styles.tabText, selected && styles.tabSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NativeShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, backgroundColor: "#ffffff" },
  webView: { flex: 1, backgroundColor: "#ffffff" },
  tabBar: {
    minHeight: 62,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d9e6e1",
    backgroundColor: "#ffffff",
  },
  tab: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 2 },
  tabGlyph: { fontSize: 20, color: "#66756f" },
  tabText: { fontSize: 11, fontWeight: "700", color: "#66756f" },
  tabSelected: { color: "#0F6E56" },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    bottom: 62,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#FAFCFB",
  },
  errorTitle: { textAlign: "center", color: "#214238", fontSize: 17, fontWeight: "700" },
  retryButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "#0F6E56",
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  retryText: { color: "#ffffff", fontWeight: "800" },
});
