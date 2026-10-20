import { AppShell } from "@/components/layout/app-shell";
import { Suspense, type ReactNode } from "react";
// Suspense lets pages that call useSearchParams() be pre-rendered in the static export.
export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) { return <AppShell><Suspense fallback={null}>{children}</Suspense></AppShell>; }
