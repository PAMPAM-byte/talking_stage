import { AccountFlow } from "@/components/account-flow";
export const metadata = { title: "Adult access", robots: { index: false, follow: false } };
export default function Page() { return <AccountFlow step="age" />; }
