import { ProtectedArea } from "@/components/protected-area";
export default function Layout({ children }: { children: React.ReactNode }) { return <ProtectedArea area="Payments">{children}</ProtectedArea>; }
