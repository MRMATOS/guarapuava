import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { HandednessProvider } from "@/context/HandednessContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://guarapuava.digital"),
  title: "Guarapuava Digital",
  description:
    "Se atualize e utilize ferramentas criadas para todos os moradores de Guarapuava.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Guarapuava Digital",
    description:
      "Se atualize e utilize ferramentas criadas para todos os moradores de Guarapuava.",
    url: "https://guarapuava.digital",
    siteName: "Guarapuava Digital",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Guarapuava Digital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guarapuava Digital",
    description:
      "Se atualize e utilize ferramentas criadas para todos os moradores de Guarapuava.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eff0f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("guarapuava-theme");var p=window.matchMedia("(prefers-color-scheme: dark)").matches;if(s==="dark"||(!s&&p)){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.classList.remove("dark");document.documentElement.setAttribute("data-theme","light");}var h=localStorage.getItem("guarapuava:handedness");if(h==="left"){document.documentElement.setAttribute("data-handedness","left");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <HandednessProvider>{children}</HandednessProvider>
        </ThemeProvider>
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
