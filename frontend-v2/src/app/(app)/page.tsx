"use client";

import { useAuth } from "@/hooks/useAuth";
import DashboardHome from "@/components/dashboard/DashboardHome";
import LoginPage from "./login/page";

export default function RootPage() {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && !isAuthenticated) {
    return <LoginPage />;
  }

  return <DashboardHome />;
}
