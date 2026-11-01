import type { Metadata } from "next";
import localFont from "next/font/local";
import "./styles.css";
import { BackToTop } from "@/components/back-to-top";

const interfaceFont = localFont({ src: "./fonts/Manrope.ttf", variable: "--font-interface", display: "swap", weight: "200 800", fallback: ["system-ui", "sans-serif"] });
const displayFont = localFont({ src: "./fonts/DMSerifDisplay.ttf", variable: "--font-display", display: "swap", weight: "400", fallback: ["Georgia", "serif"] });

export const metadata: Metadata = {
  title: { default: "TalkingStage", template: "%s · TalkingStage" },
  description: "TalkingStage is a Nigerian AI dating and chat app for adults: text fictional AI characters with real Naija personality. Free to chat, 18+.",
  metadataBase: new URL(process.env.TALKINGSTAGE_SITE_URL ?? "https://www.talkingstage.buzz"),
  applicationName: "TalkingStage",
  appleWebApp: { title: "TalkingStage", statusBarStyle: "default" },
  // Pages set their own url via lib/seo; a shared url here would point every page at home.
  openGraph: { type: "website", siteName: "TalkingStage.buzz", title: "TalkingStage — A little banter. A little chemistry.", description: "Meet fictional adult AI personalities with Nigerian flavour. Free to chat.", locale: "en_NG" },
  twitter: { card: "summary_large_image", title: "TalkingStage — A little banter. A little chemistry.", description: "Meet fictional adult AI personalities with Nigerian flavour. Free to chat." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      className={`${interfaceFont.variable} ${displayFont.variable}`}
    >
      <body><a className="skip-link" href="#main-content">Skip to content</a>{children}<BackToTop /></body>
    </html>
  );
}
