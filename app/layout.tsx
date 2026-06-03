import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { PwaRegister } from "@/components/pwa-register";

const chunkRecoveryScript = String.raw`
(function () {
  var recoveryKey = "dailybills-chunk-recovery-at";
  var recoveryParam = "db_recover";
  var retryWindowMs = 30000;

  function isNextStaticAsset(url) {
    return typeof url === "string" && url.indexOf("/_next/static/") !== -1;
  }

  function clearAppCaches() {
    try {
      if (!("caches" in window)) {
        return;
      }

      window.caches.keys().then(function (keys) {
        keys.forEach(function (key) {
          if (key.indexOf("dailybills") === 0) {
            window.caches.delete(key);
          }
        });
      });
    } catch (_error) {}
  }

  function recoverFromChunkError() {
    try {
      var now = Date.now();
      var previousAttempt = Number(window.sessionStorage.getItem(recoveryKey) || "0");

      if (previousAttempt && now - previousAttempt < retryWindowMs) {
        return;
      }

      window.sessionStorage.setItem(recoveryKey, String(now));
      clearAppCaches();

      var nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set(recoveryParam, String(now));
      window.location.replace(nextUrl.toString());
    } catch (_error) {
      window.location.reload();
    }
  }

  try {
    var currentUrl = new URL(window.location.href);

    if (currentUrl.searchParams.has(recoveryParam)) {
      currentUrl.searchParams.delete(recoveryParam);
      window.history.replaceState(null, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
    }
  } catch (_error) {}

  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      var assetUrl = target && (target.src || target.href);

      if (isNextStaticAsset(assetUrl)) {
        recoverFromChunkError();
        return;
      }

      var message = event.message || (event.error && event.error.message) || "";

      if (/ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(message)) {
        recoverFromChunkError();
      }
    },
    true
  );

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason || {};
    var message = String(reason.message || reason || "");

    if (/ChunkLoadError|Loading chunk|failed to fetch dynamically imported module|\/_next\/static\/chunks/i.test(message)) {
      recoverFromChunkError();
    }
  });
})();
`;

export const metadata: Metadata = {
  title: {
    default: "DailyBills",
    template: "%s | DailyBills"
  },
  description:
    "Know how much you can safely spend today and how much you need to earn before your next bills are due.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script id="dailybills-chunk-recovery" strategy="beforeInteractive">
          {chunkRecoveryScript}
        </Script>
        <AuthProvider>
          {children}
          <PwaRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
