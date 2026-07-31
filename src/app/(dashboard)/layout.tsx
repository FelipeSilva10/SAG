import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { readTrustedPanelSession } from "@/lib/trusted-panel-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = readTrustedPanelSession(await headers());
  if (!session) redirect("/login");

  return (
    <DashboardShell initialSession={session.actor}>
      {children}
    </DashboardShell>
  );
}
