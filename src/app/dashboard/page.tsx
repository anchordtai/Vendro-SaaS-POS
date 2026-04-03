"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserService, User } from "@/lib/user-service";
import { TenantService } from "@/lib/tenant-service";

export default function DashboardRouter() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = await UserService.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Get tenant information
      const tenantData = await TenantService.getTenantById(currentUser.tenant_id);
      if (!tenantData) {
        router.push('/login?error=tenant');
        return;
      }

      setTenant(tenantData);

      // Route based on user role
      routeUserBasedOnRole(currentUser.role);
      
    } catch (error) {
      console.error("Error loading user data:", error);
      router.push('/login?error=server');
    } finally {
      setLoading(false);
    }
  };

  const routeUserBasedOnRole = (role: string) => {
    switch (role) {
      case 'cashier':
      case 'staff':
        router.replace('/dashboard/cashier');
        break;
      case 'manager':
      case 'tenant_admin':
        router.replace('/dashboard/admin');
        break;
      case 'super_admin':
        router.replace('/admin');
        break;
      default:
        router.replace('/dashboard/cashier');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // This component should never render as it redirects immediately
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
