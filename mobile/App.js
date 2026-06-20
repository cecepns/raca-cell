import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

SplashScreen.preventAutoHideAsync();

const WEB_URL = "https://raca-cell.vercel.app/";

export default function App() {
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);

  const onAndroidBackPress = useCallback(() => {
    if (canGoBackRef.current && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onAndroidBackPress
    );

    return () => subscription.remove();
  }, [onAndroidBackPress]);

  const handleLoadEnd = async () => {
    await SplashScreen.hideAsync();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <WebView
          ref={webViewRef}
          source={{ uri: WEB_URL }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
            canGoBackRef.current = navState.canGoBack;
          }}
          onLoadEnd={handleLoadEnd}
          onError={handleLoadEnd}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webview: {
    flex: 1,
  },
});
