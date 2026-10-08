import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Create account", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="register" />; }
