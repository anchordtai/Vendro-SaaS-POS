import { supabase } from '@/lib/supabase';

export interface Staff {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: 'super_admin' | 'cashier';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface CreateStaffData {
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'cashier';
}

export interface UpdateStaffData {
  name?: string;
  email?: string;
  role?: 'super_admin' | 'cashier';
  status?: 'active' | 'inactive';
}

export class StaffService {
  // Get all staff members
  static async getAllStaff(): Promise<Staff[]> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  }

  // Get single staff member
  static async getStaffById(id: string): Promise<Staff> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching staff member:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching staff member:', error);
      throw error;
    }
  }

  // Create new staff member and user account
  static async createStaff(staffData: CreateStaffData): Promise<Staff> {
    try {
      // First create the user using regular signup (requires service role key for admin functions)
      let authUser;
      
      try {
        // Try admin.createUser first (if service role key is available)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: staffData.email,
          password: staffData.password,
          email_confirm: true,
          user_metadata: {
            name: staffData.name,
            role: staffData.role
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user account');
        authUser = authData.user;
        
      } catch (adminError) {
        console.log('Admin user creation failed, trying alternative method:', adminError);
        
        // Alternative: Create staff record first, then user will need to set password
        const { data: staffRecord, error: staffError } = await supabase
          .from('staff')
          .insert([{
            name: staffData.name,
            email: staffData.email,
            role: staffData.role,
            status: 'active'
          }])
          .select()
          .single();

        if (staffError) {
          console.error('Error creating staff record:', staffError);
          throw new Error(`Failed to create staff record: ${staffError.message}`);
        }

        if (!staffRecord) {
          throw new Error('Failed to create staff record');
        }

        // Create user with signup (will send verification email)
        const { error: signupError } = await supabase.auth.signUp({
          email: staffData.email.trim().toLowerCase(),
          password: staffData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              name: staffData.name,
              role: staffData.role,
              staff_id: staffRecord.id
            }
          }
        });

        if (signupError) {
          console.error('Error during user signup:', signupError);
          // Don't throw error here - staff record was created
          console.log('Staff record created, but user signup failed. User may need to set password later.');
        }

        return staffRecord;
      }

      // If admin creation succeeded, create staff record
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff')
        .insert([{
          user_id: authUser.id,
          name: staffData.name,
          email: staffData.email,
          role: staffData.role,
          status: 'active'
        }])
        .select()
        .single();

      if (staffError) {
        console.error('Error creating staff record:', staffError);
        // Clean up auth user if staff record creation fails
        try {
          await supabase.auth.admin.deleteUser(authUser.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        throw new Error(`Failed to create staff record: ${staffError.message}`);
      }

      if (!staffRecord) {
        throw new Error('Failed to create staff record');
      }

      return staffRecord;
      
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  // Update staff member
  static async updateStaff(id: string, updateData: UpdateStaffData): Promise<Staff> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating staff:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  }

  // Delete staff member and user account
  static async deleteStaff(id: string): Promise<void> {
    try {
      // First get the staff member to get the user_id
      const { data: staffMember, error: fetchError } = await supabase
        .from('staff')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching staff member:', fetchError);
        throw fetchError;
      }

      // Delete staff record
      const { error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (staffError) {
        console.error('Error deleting staff:', staffError);
        throw staffError;
      }

      // Delete user account if user_id exists
      if (staffMember?.user_id) {
        try {
          await supabase.auth.admin.deleteUser(staffMember.user_id);
        } catch (userError) {
          console.error('Error deleting user account:', userError);
          // Don't throw error here - staff record was deleted
          console.log('Staff record deleted, but user account deletion failed. Manual cleanup may be needed.');
        }
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  }

  // Toggle staff status
  static async toggleStaffStatus(id: string): Promise<Staff> {
    try {
      // Get current status
      const { data: staffMember, error: fetchError } = await supabase
        .from('staff')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching staff member:', fetchError);
        throw fetchError;
      }

      const newStatus = staffMember?.status === 'active' ? 'inactive' : 'active';

      // Update status
      const { data, error } = await supabase
        .from('staff')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating staff status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error toggling staff status:', error);
      throw error;
    }
  }

  // Link existing auth user to staff record
  static async linkAuthUserToStaff(email: string): Promise<void> {
    try {
      // Get the auth user by email
      const { data, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error listing users:', authError);
        throw authError;
      }

      // Type assertion for the users array
      const users = data?.users as any[] || [];
      const authUser = users.find((user: any) => user.email === email);
      
      if (!authUser) {
        throw new Error('Auth user not found');
      }

      // Find staff record by email
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('email', email)
        .single();

      if (staffError || !staffRecord) {
        console.error('Error finding staff record:', staffError);
        throw new Error('Staff record not found');
      }

      // Update staff record with user_id
      const { error: updateError } = await supabase
        .from('staff')
        .update({ user_id: authUser.id })
        .eq('id', staffRecord.id);

      if (updateError) {
        console.error('Error updating staff record:', updateError);
        throw updateError;
      }

      console.log('Successfully linked auth user to staff record');
      
    } catch (error) {
      console.error('Error linking auth user to staff:', error);
      throw error;
    }
  }

  // Manually create user account for existing staff member
  static async createUserForStaff(staffId: string, email: string, password: string): Promise<void> {
    try {
      // First get the staff member
      const { data: staffMember, error: fetchError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .single();

      if (fetchError) {
        console.error('Error fetching staff member:', fetchError);
        throw fetchError;
      }

      if (!staffMember) {
        throw new Error('Staff member not found');
      }

      // Try admin creation first
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password: password,
          email_confirm: true,
          user_metadata: {
            name: staffMember.name,
            role: staffMember.role,
            staff_id: staffMember.id
          }
        });

        if (authError) throw authError;

        // Update staff record with user_id
        if (authData.user) {
          await supabase
            .from('staff')
            .update({ user_id: authData.user.id })
            .eq('id', staffId);

          console.log('User account created successfully for staff member');
        }

      } catch (adminError) {
        console.log('Admin creation failed, trying regular signup:', adminError);
        
        // Fallback to regular signup
        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              name: staffMember.name,
              role: staffMember.role,
              staff_id: staffMember.id
            }
          }
        });

        if (signupError) {
          console.error('Error during user signup:', signupError);
          throw new Error(`Failed to create user account: ${signupError.message}`);
        }

        console.log('User signup initiated for staff member');
      }

    } catch (error) {
      console.error('Error creating user for staff:', error);
      throw error;
    }
  }

  // Search staff members
  static async searchStaff(query: string): Promise<Staff[]> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching staff:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error searching staff:', error);
      throw error;
    }
  }
}
