import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  tenant_id: string;
  outlet_id?: string;
  email: string;
  name: string;
  role: 'super_admin' | 'tenant_admin' | 'manager' | 'cashier' | 'staff';
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateUserData {
  tenant_id: string;
  outlet_id?: string;
  email: string;
  name: string;
  password: string;
  role: 'tenant_admin' | 'manager' | 'cashier' | 'staff';
  phone?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'tenant_admin' | 'manager' | 'cashier' | 'staff';
  phone?: string;
  outlet_id?: string;
  is_active?: boolean;
}

export class UserService {
  // Get current user with full details
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get all users for a tenant (tenant admin and manager only)
  static async getTenantUsers(tenantId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get users by role
  static async getUsersByRole(tenantId: string, role: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', role)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users by role:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }

  // Get single user by ID
  static async getUserById(id: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Create new user and auth account
  static async createUser(userData: CreateUserData): Promise<User> {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          role: userData.role,
          tenant_id: userData.tenant_id
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Then create the user record
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          tenant_id: userData.tenant_id,
          outlet_id: userData.outlet_id,
          email: userData.email.trim().toLowerCase(),
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          is_active: true
        }])
        .select()
        .single();

      if (userError) {
        console.error('Error creating user record:', userError);
        // Clean up auth user if user record creation fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        throw new Error(`Failed to create user record: ${userError.message}`);
      }

      if (!userRecord) {
        throw new Error('Failed to create user record');
      }

      return userRecord;
      
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(id: string, updateData: UpdateUserData): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user and auth account
  static async deleteUser(id: string): Promise<void> {
    try {
      // Delete user record
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (userError) {
        console.error('Error deleting user:', userError);
        throw userError;
      }

      // Delete auth account
      try {
        await supabase.auth.admin.deleteUser(id);
      } catch (authError) {
        console.error('Error deleting auth account:', authError);
        // Don't throw error here - user record was deleted
        console.log('User record deleted, but auth account deletion failed. Manual cleanup may be needed.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Toggle user status
  static async toggleUserStatus(id: string): Promise<User> {
    try {
      // Get current status
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
        throw fetchError;
      }

      const newStatus = !currentUser?.is_active;

      // Update status
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Search users
  static async searchUsers(tenantId: string, query: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Check if user has permission for specific action
  static hasPermission(userRole: string, action: string): boolean {
    const permissions = {
      'super_admin': [
        'view_all_tenants',
        'manage_tenants',
        'view_all_users',
        'manage_all_users',
        'view_system_stats',
        'manage_system_settings'
      ],
      'tenant_admin': [
        'view_tenant_users',
        'manage_tenant_users',
        'view_tenant_outlets',
        'manage_tenant_outlets',
        'view_tenant_products',
        'manage_tenant_products',
        'view_tenant_sales',
        'manage_tenant_sales',
        'view_tenant_reports',
        'manage_tenant_settings'
      ],
      'manager': [
        'view_tenant_users',
        'view_tenant_outlets',
        'view_tenant_products',
        'manage_tenant_products',
        'view_tenant_sales',
        'manage_tenant_sales',
        'view_tenant_reports'
      ],
      'cashier': [
        'view_tenant_products',
        'create_sales',
        'view_own_sales',
        'manage_open_tabs'
      ],
      'staff': [
        'view_tenant_products',
        'view_own_sales'
      ]
    };

    return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
  }

  // Get user permissions
  static getUserPermissions(userRole: string): string[] {
    const permissions = {
      'super_admin': [
        'view_all_tenants',
        'manage_tenants',
        'view_all_users',
        'manage_all_users',
        'view_system_stats',
        'manage_system_settings'
      ],
      'tenant_admin': [
        'view_tenant_users',
        'manage_tenant_users',
        'view_tenant_outlets',
        'manage_tenant_outlets',
        'view_tenant_products',
        'manage_tenant_products',
        'view_tenant_sales',
        'manage_tenant_sales',
        'view_tenant_reports',
        'manage_tenant_settings'
      ],
      'manager': [
        'view_tenant_users',
        'view_tenant_outlets',
        'view_tenant_products',
        'manage_tenant_products',
        'view_tenant_sales',
        'manage_tenant_sales',
        'view_tenant_reports'
      ],
      'cashier': [
        'view_tenant_products',
        'create_sales',
        'view_own_sales',
        'manage_open_tabs'
      ],
      'staff': [
        'view_tenant_products',
        'view_own_sales'
      ]
    };

    return permissions[userRole as keyof typeof permissions] || [];
  }

  // Reset user password
  static async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        console.error('Error resetting password:', error);
        throw new Error(`Failed to reset password: ${error.message}`);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(tenantId: string): Promise<{
    total: number;
    active: number;
    by_role: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching user stats:', error);
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        active: data?.filter(u => u.is_active).length || 0,
        by_role: {} as Record<string, number>
      };

      data?.forEach(user => {
        stats.by_role[user.role] = (stats.by_role[user.role] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}
