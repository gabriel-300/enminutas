import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Montserrat: sustituto web de Gotham (tipografía de marca)
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "En Minutas — Ultracongelados a base de mandioca",
    template: "%s · En Minutas",
  },
  description:
    "Bastones, noisettes y bocaditos a base de mandioca, chipas, empanadas y pizzas ultracongeladas. Elaborados en planta propia en Posadas, Misiones. Envíos a todo el país.",
  keywords: [
    "mandioca precocida",
    "bastones de mandioca",
    "noisette de mandioca",
    "ultracongelado",
    "chipa",
    "empanadas",
    "bocaditos",
    "gastronomía",
    "Posadas",
    "Misiones",
    "Argentina",
  ],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "En Minutas",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#16233f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-AR"
      className={`${fraunces.variable} ${inter.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
