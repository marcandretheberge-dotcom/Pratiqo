import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import {
  MOBILE_AGENT, MOBILE_AUTH_RETURN, MOBILE_PAYMENT_RETURN, MOBILE_PROTOCOL,
  httpsOrigin, isSandboxCheckoutUrl, navigationPolicy, prepareGoogleUrl,
  ReturnGate, validConfig, validState, type MobileConfig,
} from '../../shared';

const webOrigin = httpsOrigin(Constants.expoConfig?.extra?.webOrigin);

export default function PratiqoShell() {
  const web = useRef<WebView<WebViewProps>>(null);
  const currentPage = useRef('');
  const back = useRef(false);
  const active = useRef(false);
  const gate = useRef(new ReturnGate());
  const mounted = useRef(true);
  const [config, setConfig] = useState<MobileConfig | null>(null);
  const [source, setSource] = useState(webOrigin ? `${webOrigin}/trouver-un-prof` : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [browserBusy, setBrowserBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    mounted.current = true;
    const returnGate = gate.current;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (active.current) return true;
      if (back.current) { web.current?.goBack(); return true; }
      return false;
    });
    return () => { mounted.current = false; subscription.remove(); returnGate.clear(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let current = true;
    async function check() {
      setError(null);
      if (!webOrigin) {
        setError('Cette bêta doit être configurée avant son utilisation.');
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${webOrigin}/api/mobile/config`, {
          signal: controller.signal, headers: { 'Cache-Control': 'no-cache' },
        });
        const value: unknown = await response.json();
        if (!response.ok || !validConfig(value, webOrigin)) throw new Error('Unavailable');
        if (current) setConfig(value);
      } catch {
        if (current) { setError('Connexion à Pratiqo indisponible. Réessaie dans un instant.'); setLoading(false); }
      } finally { clearTimeout(timer); }
    }
    void check();
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [attempt]);

  const notifyCancelled = (id: string) => {
    // id has been checked as a UUID; no browser URL or credential is injected.
    web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('pratiqo:native-result', {detail:{id:${JSON.stringify(id)},ok:false}})); true;`);
  };

  function navigateInside(url: string) {
    if (!webOrigin || navigationPolicy(url, webOrigin) !== 'internal') return;
    // Repeated cancellations can target the same source prop after in-page SPA navigation.
    if (source === url) web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(url)}); true;`);
    else setSource(url);
  }

  async function handleMessage(event: WebViewMessageEvent) {
    if (!config || !webOrigin) return;
    let id = '';
    let kind: 'auth' | 'payment' | null = null;
    try {
      if (new URL(event.nativeEvent.url).origin !== webOrigin || event.nativeEvent.data.length > 12000) return;
      const message = JSON.parse(event.nativeEvent.data);
      if (message.protocol !== MOBILE_PROTOCOL || !validState(message.id) || typeof message.url !== 'string') return;
      id = message.id;
      if (message.kind !== 'auth' && message.kind !== 'payment') return;
      kind = message.kind === 'auth' ? 'auth' : 'payment';
      const state = kind === 'auth' ? Crypto.randomUUID() : id;
      let browserUrl: string;
      let webCallback: string | undefined;
      if (kind === 'auth') {
        const prepared = prepareGoogleUrl(message.url, config, state);
        browserUrl = prepared.browserUrl;
        webCallback = prepared.webCallback;
      } else {
        if (!config.sandboxCheckoutEnabled || !isSandboxCheckoutUrl(message.url)) throw new Error('Unsupported checkout');
        browserUrl = message.url;
      }
      active.current = true;
      setBrowserBusy(true);
      gate.current.start({ kind, state, webCallback, expiresAt: Date.now() + (kind === 'auth' ? 5 : 30) * 60_000 });
      const result = await WebBrowser.openAuthSessionAsync(browserUrl,
        kind === 'auth' ? MOBILE_AUTH_RETURN : MOBILE_PAYMENT_RETURN);
      if (!mounted.current) return;
      const next = result.type === 'success' ? gate.current.consume(result.url, webOrigin) : null;
      if (next) navigateInside(next);
      // Dismissal does not prove failure. Re-read existing payments instead of inviting a second booking.
      else if (kind === 'payment') navigateInside(`${webOrigin}/student/payments`);
      else notifyCancelled(id);
    } catch {
      if (mounted.current && kind === 'payment') navigateInside(`${webOrigin}/student/payments`);
      else if (mounted.current && id) notifyCancelled(id);
    }
  }

  async function onMessage(event: WebViewMessageEvent) {
    if (active.current) return;
    try { await handleMessage(event); }
    finally {
      gate.current.clear();
      active.current = false;
      if (mounted.current) setBrowserBusy(false);
    }
  }

  function navigate(url: string, mainFrame = true): boolean {
    if (!webOrigin) return false;
    const policy = navigationPolicy(url, webOrigin);
    if (policy === 'internal') return true;
    if (!mainFrame) return false;
    if (policy === 'external' || policy === 'contact') {
      Alert.alert('Ouvrir le lien ?', 'Ce lien s’ouvrira en dehors de Pratiqo.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir', onPress: () => { void Linking.openURL(url).catch(() => Alert.alert('Lien indisponible')); } },
      ]);
    } else {
      Alert.alert('Indisponible dans cette bêta', 'Ce parcours n’est pas encore disponible dans l’application.');
    }
    return false;
  }

  function retry() {
    setError(null);
    setLoading(true);
    if (config) web.current?.reload();
    else setAttempt(value => value + 1);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {config && webOrigin && <WebView<WebViewProps>
        ref={web}
        style={styles.web}
        source={{ uri: source }}
        applicationNameForUserAgent={MOBILE_AGENT}
        // '*' ensures EVERY scheme reaches our policy instead of WebView auto-opening it in the OS.
        // navigationPolicy is the actual allowlist, including initial and new-window navigations.
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={request => navigate(request.url, request.isTopFrame !== false)}
        onOpenWindow={event => {
          const url = event.nativeEvent.targetUrl;
          if (navigate(url)) navigateInside(url);
        }}
        onNavigationStateChange={state => { back.current = state.canGoBack; currentPage.current = state.url; }}
        onMessage={event => { void onMessage(event); }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setError('La connexion a été interrompue.'); setLoading(false); }}
        onHttpError={event => {
          if (event.nativeEvent.url === currentPage.current && event.nativeEvent.statusCode >= 500) {
            setError('Pratiqo est temporairement indisponible.'); setLoading(false);
          }
        }}
        onContentProcessDidTerminate={() => setError('La page doit être rechargée.')}
        onRenderProcessGone={() => setError('La page doit être rechargée.')}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={false}
        incognito={false}
        cacheEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows
        webviewDebuggingEnabled={__DEV__}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        contentInsetAdjustmentBehavior="never"
      />}
      {(loading || browserBusy) && !error && <View style={browserBusy ? styles.overlay : styles.progress} pointerEvents={browserBusy ? 'auto' : 'none'}>
        <ActivityIndicator color="#467F78" accessibilityLabel="Chargement" />
        {browserBusy && <Text style={styles.message}>Reviens ici après l’opération.</Text>}
      </View>}
      {error && <View style={styles.overlay} accessibilityLiveRegion="polite">
        <Text style={styles.title}>Pratiqo</Text>
        <Text style={styles.message}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  web: { flex: 1, backgroundColor: '#F4F9F5' },
  progress: { position: 'absolute', top: 8, right: 12, padding: 8, borderRadius: 24, backgroundColor: '#FFFFFF' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F9F5', padding: 28, gap: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#24433E' },
  message: { fontSize: 17, lineHeight: 25, textAlign: 'center', color: '#24433E' },
  button: { backgroundColor: '#467F78', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
