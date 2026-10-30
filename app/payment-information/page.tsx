import { pageMetadata } from '@/lib/seo';
import { InformationPage } from "@/components/information-page";
export const metadata = pageMetadata({ path: '/payment-information', title: "Gifts and payments", description: "How optional gifts work on TalkingStage: chatting is free, gifts are voluntary support for the team, characters receive no money, and only verified payments count." });
export default function Page() { return <InformationPage kind="payment-information" />; }
