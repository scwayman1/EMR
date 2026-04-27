"use client";

import * as React from "react";

/**
 * NativeBridge (EMR-051) — detects when the EMR is running inside a
 * Capacitor or React Native WebView wrapper and tags <html> so global
 * CSS can adapt (hide redundant top chrome, drop status-bar padding,
 * etc — see globals.css `data-app-shell="native"` block).
 *
 * Detection order:
 *   1. Capacitor — window.Capacitor is injected by the native runtime.
 *   2. React Native WebView — window.ReactNativeWebView.postMessage is the
 *      conventional bridge and the most reliable signal.
 *   3. Custom UA stamp — wrappers can append `LeafjourneyNative/<ver>` to
 *      the navigator UA so server-rendered scripts can also detect.
 *
 * Renders nothing. Mount once near the root (e.g. RootLayout body).
 */
export function NativeBridge() {
  React.useEffect(() => {
    const root = document.documentElement;
    const w = window as unknown as {
      Capacitor?: unknown;
      ReactNativeWebView?: { postMessage?: unknown };
    };

    const isCapacitor = typeof w.Capacitor !== "undefined";
    const isRNWebView =
      typeof w.ReactNativeWebView?.postMessage === "function";
    const uaNative = /LeafjourneyNative\//i.test(navigator.userAgent);

    if (isCapacitor || isRNWebView || uaNative) {
      root.setAttribute("data-app-shell", "native");
      // Surface the runtime so ad-hoc components can branch on it
      // (e.g. swap a Web file picker for the native camera roll).
      root.setAttribute(
        "data-native-runtime",
        isCapacitor ? "capacitor" : isRNWebView ? "react-native" : "ua"
      );
    }
  }, []);

  return null;
}
