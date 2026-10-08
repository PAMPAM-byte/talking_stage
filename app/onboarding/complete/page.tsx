import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Ready to explore", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="complete" />; }
