export const instant = false;
import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Reset password", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="recovery-complete" />; }
