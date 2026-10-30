import { pageMetadata } from '@/lib/seo';
import { InformationPage } from "@/components/information-page";
export const metadata = pageMetadata({ path: '/privacy', title: "Privacy", description: "How TalkingStage handles your account, chats and saved memories, what stays private, and how to delete your account with a 30-day restore window." });
export default function Page() { return <InformationPage kind="privacy" />; }
