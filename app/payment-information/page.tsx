import { pageMetadata } from '@/lib/seo';
import { InformationPage } from "@/components/information-page";
export const metadata = pageMetadata({ path: '/payment-information', title: "Gifts and payments", description: "How payments work on TalkingStage: 10 free coins, then ₦50 a coin to start chats; optional gifts; payments through Bachs, confirmed before they count; refunds for payment errors." });
export default function Page() { return <InformationPage kind="payment-information" />; }
