import type { ReactNode } from "react";
import RequireAuth from "@/components/layout/RequireAuth";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
