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
  },
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
      </body>
    </html>
  );
}
