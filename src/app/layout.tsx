import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetMono = JetBrains_Mono({
  variable: "--font-jet-mono",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Aussy Ontech — Operadora de Resiliência Orbital",
  description:
    "App offline-first para emergência, cobertura e satélites no Brasil. SOS, WiFi grátis, torres ANATEL, alertas INMET/CEMADEN/INPE/CPTEC, rios ANA, municípios IBGE, Defesa Civil e satélites D2C em um só lugar. Funciona sem internet.",
  keywords: [
    "satélite",
    "D2C",
    "Direct-to-Cell",
    "emergência",
    "SOS",
    "offline",
    "internet rural",
    "Brasil",
    "ANATEL",
    "INMET",
    "CEMADEN",
    "CPTEC",
    "INPE",
    "ANA",
    "IBGE",
    "Defesa Civil",
    "SEDEC",
    "WiFi grátis",
    "Aussy Ontech",
  ],
  authors: [{ name: "Aussy Ontech" }],
  manifest: "/manifest.json",
  applicationName: "Aussy Ontech",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aussy Ontech",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon-32.png"],
  },
  openGraph: {
    title: "Aussy Ontech — Emergência e satélites offline",
    description:
      "SOS, WiFi grátis, torres ANATEL, alertas INMET/CEMADEN, rios ANA, satélites D2C. Funciona sem internet.",
    type: "website",
    locale: "pt_BR",
    siteName: "Aussy Ontech",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aussy Ontech — Emergência e satélites offline",
    description: "SOS, WiFi grátis, torres ANATEL, alertas. Offline-first para o Brasil.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    telephone: true,
    address: false,
    email: true,
    url: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e14" },
    { media: "(prefers-color-scheme: light)", color: "#0a0e14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // permite zoom para acessibilidade (WCAG)
  userScalable: true,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        {/* iOS PWA — apple-touch-icon já vem do metadata */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aussy Ontech" />
        {/* iOS Safari — permite standalone mode */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Android Chrome — cor da barra de status */}
        <meta name="theme-color" content="#0a0e14" />
        {/* Microsoft Edge Sidebar */}
        <meta name="msapplication-TileColor" content="#0a0e14" />
        {/* SEO local */}
        <meta name="geo.region" content="BR" />
        <meta name="geo.placename" content="Brasil" />
        {/* Permissions Policy — sensores e geolocalização */}
        <meta
          httpEquiv="Permissions-Policy"
          content="geolocation=(self), microphone=(), camera=(), accelerometer=(self), gyroscope=(self), magnetometer=(self), ambient-light-sensor=(self)"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                  })
                    .then((reg) => {
                      console.log('[Aussy] SW registrado:', reg.scope);
                      // Força update quando nova versão disponível
                      reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              console.log('[Aussy] Nova versão do SW disponível — recarregando...');
                              newWorker.postMessage({ type: 'SKIP_WAITING' });
                              setTimeout(() => window.location.reload(), 500);
                            }
                          });
                        }
                      });
                    })
                    .catch((err) => console.warn('[Aussy] SW falhou:', err));
                });
              }
              // iOS standalone check — evita links externos abrirem Safari
              if (window.navigator.standalone === true) {
                document.documentElement.classList.add('ios-standalone');
              }
              // Detecta iPhone com notch/Dynamic Island
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
