import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./volponi-theme.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineChunkWarmer } from "@/components/aussy/offline-chunk-warmer";
import { ClientObservability } from "@/components/aussy/client-observability";

const DEFAULT_SITE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://aussy-br-sos.vercel.app";

function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return new URL(DEFAULT_SITE_URL);

  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : /^[a-z0-9.-]+(?::\d+)?$/i.test(raw)
      ? `https://${raw}`
      : DEFAULT_SITE_URL;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return new URL(DEFAULT_SITE_URL);
    return parsed;
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const jetMono = JetBrains_Mono({ variable: "--font-jet-mono", subsets: ["latin"], weight: ["400", "600", "800"] });

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "AUSSY.SOS — Segurança, emergência e resiliência",
  description: "Acesso rápido a SOS, alertas oficiais, localização, mapas, clima, rios e recursos de resiliência para o Brasil, com cache identificado e transparência de origem.",
  keywords: ["emergência", "SOS", "offline", "resiliência", "Brasil", "INMET", "CEMADEN", "CPTEC", "INPE", "ANA", "SGB", "Defesa Civil", "mapa", "localização", "conectividade", "satélite", "AUSSY.SOS"],
  authors: [{ name: "AUSSY.SOS" }],
  manifest: "/manifest.json",
  applicationName: "AUSSY.SOS",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AUSSY.SOS" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
  },
  openGraph: {
    title: "AUSSY.SOS — Segurança e resiliência",
    description: "SOS, alertas oficiais, mapas, localização, clima e recursos de resiliência com origem e cache identificados.",
    type: "website",
    locale: "pt_BR",
    siteName: "AUSSY.SOS",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AUSSY.SOS — Segurança e resiliência",
    description: "SOS, alertas oficiais, mapas, localização e recursos de resiliência com transparência de fonte.",
    images: ["/icon-512.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: true, address: false, email: true, url: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090b0d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="light">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AUSSY.SOS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="geo.region" content="BR" />
        <meta name="geo.placename" content="Brasil" />
        <meta
          httpEquiv="Permissions-Policy"
          content="geolocation=(self), microphone=(), camera=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), ambient-light-sensor=(self)"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${jetMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <ClientObservability />
          <OfflineChunkWarmer />
          <Toaster />
          <SonnerToaster position="top-center" />
        </ThemeProvider>
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                const hadController = Boolean(navigator.serviceWorker.controller);
                let reloadingForUpdate = false;
                const refreshOfflinePack = () => {
                  if (!navigator.onLine) return;
                  navigator.serviceWorker.ready
                    .then((reg) => {
                      const worker = navigator.serviceWorker.controller || reg.active || reg.waiting;
                      if (!worker) return;
                      worker.postMessage({ type: 'PRECACHE_SHELL' });
                      worker.postMessage({ type: 'PRECACHE_EMERGENCY' });
                    })
                    .catch(() => {});
                };
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                  if (hadController && !reloadingForUpdate) {
                    reloadingForUpdate = true;
                    window.location.reload();
                  }
                });
                navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
                  .then((reg) => {
                    console.log('[Aussy] SW registrado:', reg.scope);
                    reg.update().catch(() => {});
                    refreshOfflinePack();
                  })
                  .catch((err) => console.warn('[Aussy] SW falhou:', err));
                window.addEventListener('online', () => {
                  window.setTimeout(refreshOfflinePack, 750);
                });
              }
              if (window.navigator.standalone === true) {
                document.documentElement.classList.add('ios-standalone');
              }
              if (/iPhone/.test(navigator.userAgent) && (window.screen.height >= 812 || window.screen.width >= 812)) {
                document.documentElement.classList.add('ios-notch');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
