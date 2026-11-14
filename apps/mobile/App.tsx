import "react-native-url-polyfill/auto";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
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
import { WebView, type WebViewMessageEvent, type WebViewNavigation, type WebViewProps } from "react-native-webview";
import type { Session } from "@supabase/supabase-js";

import {
  AUTH_REDIRECT_URI,
  IS_ISOLATED,
  WEB_ORIGIN,
  isPratiqoWebUrl,
  navigation,
  webUrl,
} from "./src/config";
import { getMobileSupabase } from "./src/supabase";
import { deepLinkTarget, oauthCode, parseBridgeMessage, validIsolatedConfig } from "./src/policy";
import { nativeAppStateScript } from "./src/lifecycle";

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = "google" | "apple";

const NAV_ITEMS = [
  { label: "Accueil", glyph: "⌂", path: "/" },
  { label: "Profs", glyph: "⌕", path: "/trouver-un-prof" },
  { label: "YoPratiqo", glyph: "✦", path: "/yo" },
  { label: "Café", glyph: "☕", path: "/cafe" },
  { label: "Compte", glyph: "●", path: "/connexion" },
] as const;

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

function NativeShell() {
  const webViewRef = useRef<WebView<WebViewProps>>(null);
  const [uri, setUri] = useState(webUrl("/"));
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(uri);
  const [webFailed, setWebFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentPage = useRef(uri);
  const authBusy = useRef(false);

  const publishAppState = useCallback((state: string | null | undefined, page = currentPage.current) => {
    const script = nativeAppStateScript(page, WEB_ORIGIN, state);
    if (script) webViewRef.current?.injectJavaScript(script);
  }, []);

  const injectSession = useCallback(
    (session: Session, intent?: "learner" | "teacher" | null) => {
      if (!isPratiqoWebUrl(currentPage.current)) return;
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

        const code = oauthCode(result.url, AUTH_REDIRECT_URI);
        if (!code) throw new Error("Invalid OAuth callback");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("OAuth completed without a session");
        injectSession(session, intent);
      } catch {
        Alert.alert("Connexion impossible", "La connexion n’a pas pu être terminée. Réessaie.");
      } finally {
        authBusy.current = false;
      }
    },
    [injectSession],
  );

  const handleBridgeMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      if (IS_ISOLATED) return;
      const message = parseBridgeMessage(event.nativeEvent.data, event.nativeEvent.url, WEB_ORIGIN);
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

  const openExternal = useCallback((url: string) => {
    Alert.alert("Ouvrir le lien ?", "Ce lien s’ouvrira en dehors de Pratiqo.", [
      { text: "Annuler", style: "cancel" },
      { text: "Ouvrir", onPress: () => { void Linking.openURL(url).catch(() => Alert.alert("Lien indisponible")); } },
    ]);
  }, []);

  const shouldStart = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      const nextUrl = request.url;
      const policy = navigation(nextUrl);
      if (policy === "internal") return true;
      if (request.isTopFrame === false) return false;
      if (policy === "external" || policy === "contact") openExternal(nextUrl);
      else Alert.alert("Indisponible dans cette bêta", "Ce parcours n’est pas disponible dans cet essai.");
      return false;
    },
    [openExternal],
  );

  const navigate = useCallback((path: string) => {
    const target = webUrl(path);
    if (!target) return;
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
      const target = deepLinkTarget(url, WEB_ORIGIN, IS_ISOLATED);
      if (target) setUri(target);
    };
    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const supabase = getMobileSupabase();
    const subscription = AppState.addEventListener("change", (state) => {
      publishAppState(state);
      if (state === "active") supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, [publishAppState]);

  const bootstrap = useMemo(() => injectedBootstrap(), []);

  const navigationChanged = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    setCurrentUrl(nav.url);
    currentPage.current = nav.url;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <WebView<WebViewProps>
          ref={webViewRef}
          source={{ uri }}
          style={styles.webView}
          // Route every scheme through the policy; WebView must not auto-open rejected URLs.
          originWhitelist={["*"]}
          injectedJavaScriptBeforeContentLoaded={bootstrap}
          onMessage={handleBridgeMessage}
          onShouldStartLoadWithRequest={shouldStart}
          onOpenWindow={({ nativeEvent }) => {
            if (shouldStart({ url: nativeEvent.targetUrl })) setUri(nativeEvent.targetUrl);
          }}
          onNavigationStateChange={navigationChanged}
          onError={() => setWebFailed(true)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={({ nativeEvent }) => {
            setLoading(false);
            publishAppState(AppState.currentState, nativeEvent.url);
          }}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.url === currentPage.current && nativeEvent.statusCode >= 400) setWebFailed(true);
          }}
          onContentProcessDidTerminate={() => setWebFailed(true)}
          onRenderProcessGone={() => setWebFailed(true)}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled={false}
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          mixedContentMode="never"
          domStorageEnabled
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          // SafeAreaView owns device insets; do not apply a second iOS inset.
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          pullToRefreshEnabled
          setSupportMultipleWindows
          javaScriptCanOpenWindowsAutomatically={false}
          allowsBackForwardNavigationGestures
          applicationNameForUserAgent="PratiqoMobile/1.0"
        />
        {loading && !webFailed ? <ActivityIndicator style={styles.progress} accessibilityLabel="Chargement" /> : null}
        {webFailed ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Pratiqo est momentanément inaccessible.</Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => { setWebFailed(false); webViewRef.current?.reload(); }}>
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
                accessibilityState={{ selected }}
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
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let mounted = true;
    async function check() {
      try {
        if (!WEB_ORIGIN) throw new Error("Missing explicit origin");
        if (IS_ISOLATED) {
          const response = await fetch(`${WEB_ORIGIN}/__sandbox/mobile-config`, { signal: controller.signal, cache: "no-store" });
          if (!response.ok || !validIsolatedConfig(await response.json(), WEB_ORIGIN)) throw new Error("Isolation not verified");
        }
        if (mounted) setReady(true);
      } catch { if (mounted) setFailed(true); }
      finally { clearTimeout(timer); }
    }
    void check();
    return () => { mounted = false; clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  return (
    <SafeAreaProvider>
      {ready ? <NativeShell /> : <SafeAreaView style={styles.gate}>
        <Text style={styles.errorTitle}>{failed ? "Le prototype isolé n’est pas disponible." : "Vérification du prototype…"}</Text>
        {failed ? <Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => { setFailed(false); setAttempt(v => v + 1); }}><Text style={styles.retryText}>Réessayer</Text></Pressable> : <ActivityIndicator />}
      </SafeAreaView>}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 20 },
  progress: { position: "absolute", top: 12, right: 12 },
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
