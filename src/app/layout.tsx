import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { UpdateNotifier } from "@/components/update-notifier";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Escucha Libros — PDF a Audiolibro con voces en español",
    template: "%s · Escucha Libros",
  },
  description:
    "Convierte cualquier PDF en audiolibro. Escucha tus libros con voces en español, descarga MP3 y escucha con la pantalla apagada como Spotify. Para trabajar, manejar o hacer ejercicio.",
  keywords: [
    "audiolibros",
    "PDF a audio",
    "PDF a MP3",
    "escuchar libros",
    "TTS español",
    "lectura en voz alta",
    "audiolibro gratis",
    "convertir PDF",
    "libros en audio",
    "pantalla apagada",
    "Spotify de libros",
    "Escucha Libros",
  ],
  authors: [{ name: "Marilu Medi" }],
  creator: "Marilu Medi",
  publisher: "Escucha Libros",
  applicationName: "Escucha Libros",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    title: "Escucha Libros",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Escucha Libros — Convierte tus PDFs en audiolibros",
    description:
      "Escucha cualquier PDF con voces en español. Descarga MP3 y escucha con la pantalla apagada, como Spotify. Ideal para trabajar, manejar o hacer ejercicio.",
    type: "website",
    siteName: "Escucha Libros",
    locale: "es_ES",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Escucha Libros",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Escucha Libros — PDF a Audiolibro",
    description:
      "Convierte cualquier PDF en audiolibro. Escucha con la pantalla apagada como Spotify.",
    images: ["/icons/icon-512.png"],
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFBF7" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* PWA: iOS splash screen background color */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Improve perceived performance — show content immediately while SW boots */}
        <meta name="color-scheme" content="light dark" />
        {/* ─── Splash screen (shown before React hydrates) ─── */}
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Splash screen — hidden by JS once React mounts the app */}
        <div
          id="app-splash"
          className="app-splash"
          dangerouslySetInnerHTML={{ __html: SPLASH_HTML }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster />
            <InstallPrompt />
            <UpdateNotifier />
          </TooltipProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hide splash screen as soon as the app is interactive
              function hideSplash() {
                var s = document.getElementById('app-splash');
                if (s) {
                  s.classList.add('app-splash--hidden');
                  setTimeout(function() { s.remove(); }, 400);
                }
              }
              if (document.readyState === 'complete') {
                setTimeout(hideSplash, 300);
              } else {
                window.addEventListener('load', function() {
                  setTimeout(hideSplash, 300);
                });
              }
              // Fallback: hide after 4s no matter what (don't trap the user)
              setTimeout(hideSplash, 4000);

              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  // Register SW with stable URL — updateViaCache: 'none' ensures
                  // the browser always checks the network for SW updates
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

// ─── Splash screen markup ───
// Inline so it shows immediately, even before CSS from globals.css loads.
const SPLASH_HTML = `
  <div class="app-splash__logo" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 18V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10"/>
      <path d="M3 18h18"/>
      <path d="M9 8v10"/>
      <path d="M15 8v10"/>
      <path d="M12 8v10"/>
    </svg>
  </div>
  <div class="app-splash__title">Escucha Libros</div>
  <div class="app-splash__tagline">Tus PDFs convertidos en audiolibro</div>
  <div class="app-splash__spinner" aria-hidden="true"></div>
`;

// Inline CSS for the splash screen — same as globals.css but inlined so it
// works even before the stylesheet loads.
const SPLASH_CSS = `
  .app-splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #FDFBF7;
    transition: opacity 0.3s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .app-splash__logo {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, #2A9D8F 0%, #21867A 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    animation: splash-breathe 2s ease-in-out infinite;
    box-shadow: 0 10px 30px rgba(42, 157, 143, 0.3);
  }
  .app-splash__logo svg {
    width: 44px;
    height: 44px;
    color: white;
  }
  .app-splash__title {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 4px;
    letter-spacing: -0.02em;
  }
  .app-splash__tagline {
    font-size: 13px;
    color: #666;
    text-align: center;
    padding: 0 32px;
  }
  .app-splash__spinner {
    margin-top: 28px;
    width: 24px;
    height: 24px;
    border: 2.5px solid rgba(42, 157, 143, 0.2);
    border-top-color: #2A9D8F;
    border-radius: 50%;
    animation: splash-spin 0.8s linear infinite;
  }
  .app-splash--hidden {
    opacity: 0;
    pointer-events: none;
  }
  @keyframes splash-breathe {
    0%, 100% { transform: scale(1); opacity: 0.95; }
    50% { transform: scale(1.05); opacity: 1; }
  }
  @keyframes splash-spin {
    to { transform: rotate(360deg); }
  }
`;
