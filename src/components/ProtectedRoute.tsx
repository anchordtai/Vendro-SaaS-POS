"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, restoreSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (hasRedirected) return;

      // If we don't have auth yet, try to restore from cookie-backed session.
      if (!isAuthenticated && !user) {
        try {
          await restoreSession();
        } catch (e) {
          console.warn("[ProtectedRoute] restoreSession failed", e);
        }
      }

      // After restore, decide what to do.
      if (hasRedirected) return;
      if (!useAuthStore.getState().isAuthenticated) {
        setHasRedirected(true);
        router.push("/login");
        return;
      }

      const currentUser = useAuthStore.getState().user;
      if (allowedRoles && currentUser) {
        if (!allowedRoles.includes(String(currentUser.role))) {
          setHasRedirected(true);
          router.push("/dashboard?error=unauthorized");
          return;
        }
      }

      setIsChecking(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, allowedRoles, hasRedirected, restoreSession, isAuthenticated, user]);

  // Show minimal loading state
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-night-900">
        <div className="text-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, let the page render.
  return <>{children}</>;
}
