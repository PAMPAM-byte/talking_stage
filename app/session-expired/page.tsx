import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Session expired", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="sign-in" expired />; }
