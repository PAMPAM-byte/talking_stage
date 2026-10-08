import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="sign-in" />; }
