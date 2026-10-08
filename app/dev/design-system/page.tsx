import { notFound } from "next/navigation";
import Preview from "@talkingstage/preview";
export const metadata = { title: "Design system", robots: { index: false, follow: false } };
export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Build-time alias replaces the preview with an empty module in production.
  return <Preview />;
}
