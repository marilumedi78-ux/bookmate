import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
  title: "BookMate - Tu Compañero de Libros",
  description:
    "Sumérgete en la lectura con audio inteligente, sonidos ambientales y seguimiento de progreso. Tu compañero perfecto para libros audiobook y lectura visual.",
  keywords: [
    "BookMate",
    "audiolibros",
    "lectura",
    "audio",
    "TTS",
    "audiobook",
    "reading",
    "book tracker",
  ],
  authors: [{ name: "BookMate Team" }],
  icons: {
    icon: "/logo.svg",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "BookMate - Tu Compañero de Libros",
    description:
      "Sumérgete en la lectura con audio inteligente, sonidos ambientales y seguimiento de progreso.",
    type: "website",
    siteName: "BookMate",
  },
  twitter: {
    card: "summary_large_image",
    title: "BookMate - Tu Compañero de Libros",
    description:
      "Sumérgete en la lectura con audio inteligente, sonidos ambientales y seguimiento de progreso.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2A9D8F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BookMate" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
