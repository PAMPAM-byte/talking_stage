export const instant = false;
import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Your preferences", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="preferences" />; }
