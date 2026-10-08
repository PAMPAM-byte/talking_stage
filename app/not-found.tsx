import Link from "next/link";
import { PublicShell } from "@/components/shells";
import { EmptyState } from "@/components/ui/primitives";
export default function NotFound() { return <PublicShell><EmptyState title="This page isn't here" icon="discover" action={<Link className="button button--primary" href="/">Back to TalkingStage</Link>}>Check the address or return to the home page.</EmptyState></PublicShell>; }
