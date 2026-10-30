import { pageMetadata } from '@/lib/seo';
import { SupportPage } from "@/components/support-page";
export const metadata = pageMetadata({ path: '/support', title: "Help & support", description: "Get help with TalkingStage: signing in, recovering your account, Discover, chats, memories, reporting a message and optional gifts." });
export default function Page() { return <SupportPage />; }
