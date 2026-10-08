import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Age assurance", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="assurance" />; }
