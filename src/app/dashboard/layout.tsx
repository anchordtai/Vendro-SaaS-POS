"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiClipboard,
  FiBarChart2,
  FiUsers,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiMoon,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: FiHome },
  { name: "POS", href: "/dashboard/pos", icon: FiShoppingCart },
  { name: "Products", href: "/dashboard/products", icon: FiPackage },
  { name: "Inventory", href: "/dashboard/inventory", icon: FiClipboard },
  { name: "Sales", href: "/dashboard/sales", icon: FiBarChart2 },
  { name: "Reports", href: "/dashboard/reports", icon: FiBarChart2 },
  { name: "Staff", href: "/dashboard/staff", icon: FiUsers },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();

  return (
    <ProtectedRoute>
      <DashboardLayoutContent 
        user={user}
        logout={logout}
        isAuthenticated={isAuthenticated}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        router={router}
        pathname={pathname}
      >
        {children}
      </DashboardLayoutContent>
    </ProtectedRoute>
  );
}

function DashboardLayoutContent({
  children,
  user,
  logout,
  isAuthenticated,
  sidebarOpen,
  setSidebarOpen,
  isOnline,
  setIsOnline,
  router,
  pathname
}: {
  children: React.ReactNode;
  user: any;
  logout: any;
  isAuthenticated: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  router: any;
  pathname: string;
}) {

  useEffect(() => {
    // Role protection - redirect cashiers to POS
    if (user?.role === "cashier" && pathname !== "/dashboard/pos") {
      router.replace("/dashboard/pos");
    }
  }, [user?.role, pathname, router]);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if logout fails
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-center text-white bg-red-500">
          <FiWifiOff className="w-4 h-4" />
          <span>You are offline - Sales will be saved locally</span>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-night-900 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl">
                <FiMoon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">Onyxx</h1>
                <p className="text-xs text-night-300">Nightlife POS</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-night-300 hover:text-white"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-night-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                <span className="font-semibold text-primary">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs capitalize text-night-300">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
              {isOnline && <FiWifi className="w-5 h-5 text-green-400" />}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full gap-2 px-4 py-2 transition-colors rounded-lg text-night-200 hover:text-white hover:bg-white/10"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-4 py-3 bg-white border-b border-gray-200 lg:px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 rounded-lg lg:hidden hover:bg-gray-100"
            >
              <FiMenu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:flex-none" />
            <div className="flex items-center gap-4">
              <div className="items-center hidden gap-2 text-sm text-gray-600 sm:flex">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
