import { pageMetadata } from '@/lib/seo';
import { InformationPage } from "@/components/information-page";
export const metadata = pageMetadata({ path: '/terms', title: "Terms of use", description: "The terms for using TalkingStage, an adults-only (18+) chat app with fictional AI characters: eligibility, acceptable use, AI-generated content and optional gifts." });
export default function Page() { return <InformationPage kind="terms" />; }
