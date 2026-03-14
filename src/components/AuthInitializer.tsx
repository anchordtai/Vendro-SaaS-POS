"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export default function AuthInitializer() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    // Restore session once on app initialization
    restoreSession();
  }, [restoreSession]);

  return null; // This component doesn't render anything
}
