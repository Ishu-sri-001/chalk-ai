import { Geist_Mono, Host_Grotesk, Instrument_Sans, Kalam, STIX_Two_Text } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const headFont = Host_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-head",
  display: "swap",
});

const sansFont = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

const code = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

const board = Kalam({
  variable: "--font-board",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const formula = STIX_Two_Text({
  variable: "--font-formula",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata = {
  title: "ChalkAI: AI whiteboard tutor",
  description:
    "Name any topic. Chalk writes a short lesson, draws it on a whiteboard and talks you through it.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c121c" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('chalk-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${headFont.variable} ${sansFont.variable} ${code.variable} ${board.variable} ${formula.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
