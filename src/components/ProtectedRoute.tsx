"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("super_admin" | "cashier")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Prevent multiple redirects
      if (hasRedirected) return;
      
      try {
        // Quick session check without restoration
        const sessionData = localStorage.getItem('pos_session');
        
        if (!sessionData) {
          console.log('No session found, redirecting to login');
          setHasRedirected(true);
          router.push("/");
          return;
        }

        // Parse and validate session quickly
        const session = JSON.parse(sessionData);
        if (!session.user || !session.user.id || !session.user.email) {
          localStorage.removeItem('pos_session');
          setHasRedirected(true);
          router.push("/");
          return;
        }

        // Check role-based access if roles are specified
        if (allowedRoles && session.user && !allowedRoles.includes(session.user.role as "super_admin" | "cashier")) {
          console.log('Access denied: insufficient permissions');
          setHasRedirected(true);
          router.push("/dashboard");
          return;
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Auth check error:', error);
        if (!hasRedirected) {
          setHasRedirected(true);
          router.push("/");
        }
      }
    };

    // Only run check if we haven't redirected yet
    if (!hasRedirected) {
      checkAuth();
    }
  }, [router, allowedRoles, hasRedirected]);

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

  // Don't render anything if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role as "super_admin" | "cashier")) {
    return null;
  }

  return <>{children}</>;
}
