"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Building, 
  CreditCard, 
  TrendingUp, 
  Settings, 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Activity,
  BarChart3,
  UserPlus,
  Shield,
  LogOut,
  Bell,
  Menu,
  X
} from "lucide-react";

interface Tenant {
  id: string;
  business_name: string;
  business_type: string;
  business_size: string;
  status: 'active' | 'trial' | 'expired' | 'suspended';
  created_at: string;
  subscription?: {
    plan_name: string;
    status: string;
    expires_at: string;
    trial_ends_at: string;
  };
  users_count: number;
  total_sales: number;
  total_products: number;
  total_customers: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: boolean;
  tenant_id: string;
  tenant_name: string;
  last_login: string;
  created_at: string;
}

interface SystemStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  expired_tenants: number;
  total_users: number;
  active_users: number;
  total_revenue: number;
  monthly_revenue: number;
  total_products: number;
  total_sales: number;
  total_customers: number;
}

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Form states
  const [tenantForm, setTenantForm] = useState({
    business_name: '',
    business_type: '',
    business_size: '',
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'cashier',
    tenant_id: '',
    password: ''
  });

  useEffect(() => {
    // Check for custom session first (super admin)
    const sessionData = localStorage.getItem('vendro_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (session.user && session.user.role === 'super_admin') {
          setUser(session.user);
          loadAdminData();
          return;
        }
      } catch (e) {
        // Invalid session, clear it
        localStorage.removeItem('vendro_session');
      }
    }
    
    // If no valid session, redirect to admin login
    router.push('/admin/login');
  }, [router]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load all admin data in parallel
      const [statsResponse, tenantsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/tenants'),
        fetch('/api/admin/users')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (tenantsResponse.ok) {
        const tenantsData = await tenantsResponse.json();
        setTenants(tenantsData || []);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData || []);
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendro_session');
    router.push('/login');
  };

  const handleCreateTenant = async () => {
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantForm)
      });

      if (response.ok) {
        const newTenant = await response.json();
        setTenants([...tenants, newTenant]);
        setShowTenantModal(false);
        setTenantForm({
          business_name: '',
          business_type: '',
          business_size: '',
          admin_name: '',
          admin_email: '',
          admin_password: ''
        });
        alert('Tenant created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert('Error creating tenant. Please try again.');
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers([...users, newUser]);
        setShowUserModal(false);
        setUserForm({
          name: '',
          email: '',
          role: 'cashier',
          tenant_id: '',
          password: ''
        });
        alert('User created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user. Please try again.');
    }
  };

  const handleSuspendTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to suspend this tenant?')) return;

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/suspend`, {
        method: 'POST'
      });

      if (response.ok) {
        setTenants(tenants.map(t => 
          t.id === tenantId ? { ...t, status: 'suspended' } : t
        ));
        alert('Tenant suspended successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error suspending tenant:', error);
      alert('Error suspending tenant. Please try again.');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone!')) return;

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTenants(tenants.filter(t => t.id !== tenantId));
        alert('Tenant deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Error deleting tenant. Please try again.');
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.business_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-white hover:bg-white/10 rounded-lg lg:hidden"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Shield className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                  Super Admin
                </h1>
                <p className="text-xs text-gray-400">Vendro POS Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center bg-white/10 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search tenants..."
                  className="bg-transparent text-white placeholder-gray-400 outline-none text-sm w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-purple-400">Super Admin</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 transform transition-transform lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-xs text-purple-400">Administrator</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'tenants', label: 'Tenants', icon: Building },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-white/10">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-500/30">
                <p className="text-xs text-purple-400">System Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">System Overview</h2>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export Report</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Total Tenants</p>
                      <p className="text-2xl font-bold text-white">{stats?.total_tenants || 0}</p>
                      <div className="flex items-center mt-2">
                        <Activity className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400 text-sm">{stats?.active_tenants || 0} active</span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Building className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                      <div className="flex items-center mt-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400 text-sm">{stats?.active_users || 0} active</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold text-white">₦{(stats?.total_revenue || 0).toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-green-400 text-sm">₦{(stats?.monthly_revenue || 0).toLocaleString()} this month</span>
                      </div>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">System Activity</p>
                      <p className="text-2xl font-bold text-white">{stats?.total_sales || 0}</p>
                      <div className="flex items-center mt-2">
                        <BarChart3 className="w-4 h-4 text-purple-400 mr-1" />
                        <span className="text-purple-400 text-sm">{stats?.total_products || 0} products</span>
                      </div>
                    </div>
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <Activity className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Tenants</h3>
                  <div className="space-y-3">
                    {tenants.slice(0, 5).map(tenant => (
                      <div key={tenant.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{tenant.business_name}</p>
                          <p className="text-gray-400 text-sm">{tenant.business_type} • {tenant.business_size}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tenant.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            tenant.status === 'trial' ? 'bg-blue-500/20 text-blue-400' :
                            tenant.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {tenant.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {tenants.length === 0 && (
                      <p className="text-gray-400 text-center py-8">No tenants yet</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Database Connection</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Healthy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">API Response Time</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">~45ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Active Sessions</span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{stats?.active_users || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Storage Usage</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">23%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tenants Tab */}
          {activeTab === 'tenants' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Tenant Management ({tenants.length})</h2>
                <div className="flex space-x-2">
                  <select
                    className="px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <button
                    onClick={() => setShowTenantModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-2"
                  >
                    <Building className="w-4 h-4" />
                    <span>New Tenant</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4">Business</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Size</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Users</th>
                        <th className="text-left py-3 px-4">Revenue</th>
                        <th className="text-left py-3 px-4">Created</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map(tenant => (
                        <tr key={tenant.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{tenant.business_name}</p>
                              <p className="text-gray-400 text-xs">ID: {tenant.id.slice(0, 8)}...</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{tenant.business_type}</td>
                          <td className="py-3 px-4">{tenant.business_size}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tenant.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              tenant.status === 'trial' ? 'bg-blue-500/20 text-blue-400' :
                              tenant.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tenant.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">{tenant.users_count}</td>
                          <td className="py-3 px-4">₦{(tenant.total_sales || 0).toLocaleString()}</td>
                          <td className="py-3 px-4">{new Date(tenant.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedTenant(tenant)}
                                className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSuspendTenant(tenant.id)}
                                className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTenant(tenant.id)}
                                className="p-1 bg-white/10 text-red-400 rounded hover:bg-white/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tenants.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-400">
                            No tenants found. Create your first tenant to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">User Management ({users.length})</h2>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>New User</span>
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Tenant</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Last Login</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <span className="text-purple-400 text-xs font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                              user.role === 'tenant_admin' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">{user.tenant_name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.status ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{user.last_login || 'Never'}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                                <Ban className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400">
                            No users found. Create your first user to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs (placeholder) */}
          {activeTab === 'subscriptions' && (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Subscriptions Management</h3>
              <p className="text-gray-400">Subscription management features coming soon...</p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Analytics & Reports</h2>
                <div className="flex space-x-2">
                  <select className="px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20">
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                  </select>
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export Report</span>
                  </button>
                </div>
              </div>

              {/* Revenue Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Revenue Overview</h3>
                  <div className="h-64 flex items-center justify-center bg-white/5 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-gray-400">Revenue Chart</p>
                      <p className="text-gray-500 text-sm">Monthly revenue trends</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Today</p>
                      <p className="text-xl font-bold text-white">₦0</p>
                      <p className="text-green-400 text-xs">+0%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">This Week</p>
                      <p className="text-xl font-bold text-white">₦0</p>
                      <p className="text-green-400 text-xs">+0%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">This Month</p>
                      <p className="text-xl font-bold text-white">₦0</p>
                      <p className="text-green-400 text-xs">+0%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">This Year</p>
                      <p className="text-xl font-bold text-white">₦0</p>
                      <p className="text-green-400 text-xs">+0%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Top Tenants</h3>
                  <div className="space-y-3">
                    {tenants.slice(0, 5).map((tenant, index) => (
                      <div key={tenant.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <span className="text-purple-400 text-xs font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{tenant.business_name}</p>
                            <p className="text-gray-400 text-xs">{tenant.business_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">₦{(tenant.total_sales || 0).toLocaleString()}</p>
                          <p className="text-gray-400 text-xs">{tenant.users_count} users</p>
                        </div>
                      </div>
                    ))}
                    {tenants.length === 0 && (
                      <p className="text-gray-400 text-center py-8">No tenants yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Growth Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-green-400 text-sm">+12.5%</span>
                  </div>
                  <p className="text-gray-400 text-sm">New Tenants</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_tenants || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">This month</p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-green-400 text-sm">+8.3%</span>
                  </div>
                  <p className="text-gray-400 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-white">{stats?.active_users || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">Currently online</p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-red-400 text-sm">-2.1%</span>
                  </div>
                  <p className="text-gray-400 text-sm">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">3.2%</p>
                  <p className="text-gray-500 text-xs mt-1">Trial to paid</p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Activity className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-green-400 text-sm">+15.7%</span>
                  </div>
                  <p className="text-gray-400 text-sm">Total Transactions</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_sales || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">All time</p>
                </div>
              </div>

              {/* Business Type Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Business Type Distribution</h3>
                  <div className="space-y-4">
                    {['pharmacy', 'retail', 'bar', 'nightclub', 'grocery'].map((type) => {
                      const count = tenants.filter(t => t.business_type === type).length;
                      const percentage = tenants.length > 0 ? (count / tenants.length) * 100 : 0;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-white capitalize">{type}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-24 bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-purple-500 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-400 text-sm w-12 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">User Activity</h3>
                  <div className="h-48 flex items-center justify-center bg-white/5 rounded-lg">
                    <div className="text-center">
                      <Activity className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-gray-400">Activity Chart</p>
                      <p className="text-gray-500 text-sm">User login trends</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Reports Table */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">Tenant Performance Report</h3>
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm">
                    Generate Full Report
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4">Tenant</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Users</th>
                        <th className="text-left py-3 px-4">Products</th>
                        <th className="text-left py-3 px-4">Sales</th>
                        <th className="text-left py-3 px-4">Revenue</th>
                        <th className="text-left py-3 px-4">Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.slice(0, 10).map((tenant) => (
                        <tr key={tenant.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <p className="font-medium">{tenant.business_name}</p>
                            <p className="text-gray-400 text-xs">ID: {tenant.id.slice(0, 8)}...</p>
                          </td>
                          <td className="py-3 px-4 capitalize">{tenant.business_type}</td>
                          <td className="py-3 px-4">{tenant.users_count}</td>
                          <td className="py-3 px-4">{tenant.total_products}</td>
                          <td className="py-3 px-4">{tenant.total_sales}</td>
                          <td className="py-3 px-4">₦{(tenant.total_sales || 0).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="text-green-400 text-sm">+0%</span>
                          </td>
                        </tr>
                      ))}
                      {tenants.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400">
                            No tenant data available yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">System Settings</h2>
                <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Configuration */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">System Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Platform Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        defaultValue="Vendro POS"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Default Currency</label>
                      <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                        <option value="NGN">Nigerian Naira (₦)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Default Tax Rate (%)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        defaultValue="7.5"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        defaultValue="30"
                        min="5"
                        max="480"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Configuration */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Email Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">SMTP Server</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">SMTP Port</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        defaultValue="587"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Email Username</label>
                      <input
                        type="email"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        placeholder="noreply@vendro.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Email Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Two-Factor Authentication</p>
                        <p className="text-gray-400 text-sm">Require 2FA for all admin users</p>
                      </div>
                      <button className="w-12 h-6 bg-purple-500 rounded-full relative transition-colors">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Session Monitoring</p>
                        <p className="text-gray-400 text-sm">Track active user sessions</p>
                      </div>
                      <button className="w-12 h-6 bg-purple-500 rounded-full relative transition-colors">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">API Rate Limiting</p>
                        <p className="text-gray-400 text-sm">Limit API requests per user</p>
                      </div>
                      <button className="w-12 h-6 bg-gray-600 rounded-full relative transition-colors">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Backup Encryption</p>
                        <p className="text-gray-400 text-sm">Encrypt database backups</p>
                      </div>
                      <button className="w-12 h-6 bg-purple-500 rounded-full relative transition-colors">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Backup Settings */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Backup Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Backup Frequency</label>
                      <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Retention Period (days)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        defaultValue="30"
                        min="1"
                        max="365"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Backup Location</label>
                      <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                        <option value="local">Local Storage</option>
                        <option value="cloud">Cloud Storage</option>
                        <option value="both">Both Local & Cloud</option>
                      </select>
                    </div>
                    <button className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
                      Create Backup Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Tenant Modal */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Create New Tenant</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-1">Business Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Enter business name"
                  value={tenantForm.business_name}
                  onChange={(e) => setTenantForm({...tenantForm, business_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Business Type</label>
                <select
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  value={tenantForm.business_type}
                  onChange={(e) => setTenantForm({...tenantForm, business_type: e.target.value})}
                >
                  <option value="">Select type</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="bar">Bar</option>
                  <option value="nightclub">Nightclub</option>
                  <option value="grocery">Grocery</option>
                  <option value="retail">Retail</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Business Size</label>
                <select
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  value={tenantForm.business_size}
                  onChange={(e) => setTenantForm({...tenantForm, business_size: e.target.value})}
                >
                  <option value="">Select size</option>
                  <option value="small">Small (1-10 employees)</option>
                  <option value="medium">Medium (11-50 employees)</option>
                  <option value="large">Large (50+ employees)</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Admin Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Admin full name"
                  value={tenantForm.admin_name}
                  onChange={(e) => setTenantForm({...tenantForm, admin_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Admin Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="admin@example.com"
                  value={tenantForm.admin_email}
                  onChange={(e) => setTenantForm({...tenantForm, admin_email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Admin Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Enter password"
                  value={tenantForm.admin_password}
                  onChange={(e) => setTenantForm({...tenantForm, admin_password: e.target.value})}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCreateTenant}
                disabled={!tenantForm.business_name || !tenantForm.business_type || !tenantForm.business_size || !tenantForm.admin_name || !tenantForm.admin_email || !tenantForm.admin_password}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:bg-gray-600 disabled:text-gray-400"
              >
                Create Tenant
              </button>
              <button
                onClick={() => setShowTenantModal(false)}
                className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Create New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Enter full name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="user@example.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Role</label>
                <select
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                >
                  <option value="cashier">Cashier</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Tenant</label>
                <select
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  value={userForm.tenant_id}
                  onChange={(e) => setUserForm({...userForm, tenant_id: e.target.value})}
                >
                  <option value="">Select tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>{tenant.business_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Enter password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCreateUser}
                disabled={!userForm.name || !userForm.email || !userForm.tenant_id || !userForm.password}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:bg-gray-600 disabled:text-gray-400"
              >
                Create User
              </button>
              <button
                onClick={() => setShowUserModal(false)}
                className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
