import type { Metadata } from "next";
import localFont from "next/font/local";
import "./styles.css";

const interfaceFont = localFont({ src: "./fonts/Manrope.ttf", variable: "--font-interface", display: "swap", weight: "200 800", fallback: ["system-ui", "sans-serif"] });
const displayFont = localFont({ src: "./fonts/DMSerifDisplay.ttf", variable: "--font-display", display: "swap", weight: "400", fallback: ["Georgia", "serif"] });

export const metadata: Metadata = {
  title: { default: "TalkingStage", template: "%s · TalkingStage" },
  description: "A Nigerian AI dating experience with fictional adult characters.",
  metadataBase: new URL(process.env.TALKINGSTAGE_SITE_URL ?? "https://www.talkingstage.buzz"),
  applicationName: "TalkingStage",
  appleWebApp: { title: "TalkingStage", statusBarStyle: "default" },
  openGraph: { type: "website", url: "/", siteName: "TalkingStage", title: "TalkingStage — A little banter. A little chemistry.", description: "Meet fictional adult AI personalities with Nigerian flavour. Free to chat.", locale: "en_NG" },
  twitter: { card: "summary_large_image", title: "TalkingStage — A little banter. A little chemistry.", description: "Meet fictional adult AI personalities with Nigerian flavour. Free to chat." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interfaceFont.variable} ${displayFont.variable}`}
    >
      <body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body>
    </html>
  );
}
