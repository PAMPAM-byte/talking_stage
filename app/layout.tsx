import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./stage-2.css";
import "./stage-3.css";
import "./stage-4.css";
import "./stage-5.css";
import "./stage-6.css";

const interfaceFont = localFont({ src: "./fonts/Manrope.ttf", variable: "--font-interface", display: "swap", weight: "200 800", fallback: ["system-ui", "sans-serif"] });
const displayFont = localFont({ src: "./fonts/DMSerifDisplay.ttf", variable: "--font-display", display: "swap", weight: "400", fallback: ["Georgia", "serif"] });

export const metadata: Metadata = {
  title: { default: "TalkingStage", template: "%s · TalkingStage" },
  description: "A Nigerian AI dating experience with fictional adult characters.",
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
