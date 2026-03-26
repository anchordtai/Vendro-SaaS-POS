import { supabase } from './supabase';
import type { 
  Tenant, 
  BusinessType, 
  BusinessSize, 
  Plan, 
  Subscription, 
  Outlet, 
  User,
  FeatureFlag 
} from '@/types/saas';

export class TenantService {
  // Create a new tenant with trial subscription
  static async createTenant(data: {
    business_name: string;
    business_type: BusinessType;
    business_size: BusinessSize;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    admin_user: {
      id?: string; // Optional auth user ID
      name: string;
      email: string;
      password: string;
    };
  }): Promise<{ tenant: Tenant; user: User; subscription: Subscription }> {
    try {
      // Start a transaction-like operation
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          business_name: data.business_name,
          business_type: data.business_type,
          business_size: data.business_size,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          country: data.country,
          settings: {}
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create admin user with the auth user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          id: data.admin_user.id, // Use the auth user ID
          tenant_id: tenant.id,
          email: data.admin_user.email,
          password_hash: data.admin_user.password, // This should be hashed
          name: data.admin_user.name,
          role: 'tenant_admin',
          is_active: true
        })
        .select()
        .single();

      if (userError) throw userError;

      // Get starter plan for the business size
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('tier', 'starter')
        .ilike('name', `%${data.business_size}%`)
        .single();

      if (planError) throw planError;

      // Create trial subscription (7 days)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial

      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenant.id,
          plan_id: plan.id,
          status: 'trial',
          billing_cycle: 'monthly',
          trial_ends_at: trialEndsAt.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt.toISOString()
        })
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      // Initialize feature flags for the tenant based on business type
      await this.initializeFeatureFlags(tenant.id, data.business_type);

      // Create default outlet
      await this.createDefaultOutlet(tenant.id);

      return { tenant, user, subscription };
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  // Initialize feature flags for a new tenant
  static async initializeFeatureFlags(tenantId: string, businessType: BusinessType) {
    const { BUSINESS_TYPE_CONFIGS } = await import('@/types/saas');
    const config = BUSINESS_TYPE_CONFIGS[businessType];
    
    const featureFlags = config.features.map(feature => ({
      tenant_id: tenantId,
      feature_key: feature,
      is_enabled: true,
      settings: {}
    }));

    const { error } = await supabase
      .from('feature_flags')
      .insert(featureFlags);

    if (error) throw error;
  }

  // Create default outlet for new tenant
  static async createDefaultOutlet(tenantId: string) {
    const { error } = await supabase
      .from('outlets')
      .insert({
        tenant_id: tenantId,
        name: 'Main Outlet',
        is_active: true,
        settings: {}
      });

    if (error) throw error;
  }

  // Get tenant by ID
  static async getTenantById(tenantId: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tenant:', error);
      return null;
    }
  }

  // Get tenant by user ID
  static async getTenantByUserId(userId: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return await this.getTenantById(data.tenant_id);
    } catch (error) {
      console.error('Error fetching tenant by user:', error);
      return null;
    }
  }

  // Update tenant
  static async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  // Get all plans
  static async getPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
  }

  // Get subscription for tenant
  static async getSubscription(tenantId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['trial', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  // Get feature flags for tenant
  static async getFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return [];
    }
  }

  // Check if tenant has access to a feature
  static async hasFeatureAccess(tenantId: string, featureKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_feature_access', {
          p_feature_key: featureKey,
          p_user_id: null // Will use current auth user
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  // Check subscription limits
  static async checkSubscriptionLimit(tenantId: string, limitType: 'products' | 'outlets' | 'users'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_subscription_limit', {
          p_limit_type: limitType,
          p_tenant_id: tenantId
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking subscription limit:', error);
      return false;
    }
  }

  // Get current usage statistics
  static async getUsageStats(tenantId: string): Promise<{
    products: number;
    outlets: number;
    users: number;
    limits: {
      products: number;
      outlets: number;
      users: number;
    };
  }> {
    try {
      // Get current counts
      const [productsResult, outletsResult, usersResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
        supabase.from('outlets').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
        supabase.from('users').select('id', { count: 'exact' }).eq('tenant_id', tenantId)
      ]);

      // Get limits from subscription
      const { data: subscription } = await this.getSubscription(tenantId);
      let limits = { products: 0, outlets: 0, users: 0 };

      if (subscription) {
        const { data: plan } = await supabase
          .from('plans')
          .select('max_products, max_outlets, max_users')
          .eq('id', subscription.plan_id)
          .single();

        if (plan) {
          limits = {
            products: plan.max_products,
            outlets: plan.max_outlets,
            users: plan.max_users
          };
        }
      }

      return {
        products: productsResult.count || 0,
        outlets: outletsResult.count || 0,
        users: usersResult.count || 0,
        limits
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return {
        products: 0,
        outlets: 0,
        users: 0,
        limits: { products: 0, outlets: 0, users: 0 }
      };
    }
  }

  // Get outlets for tenant
  static async getOutlets(tenantId: string): Promise<Outlet[]> {
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching outlets:', error);
      return [];
    }
  }

  // Create new outlet
  static async createOutlet(tenantId: string, outletData: Omit<Outlet, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<Outlet> {
    try {
      const { data, error } = await supabase
        .from('outlets')
        .insert({
          tenant_id: tenantId,
          ...outletData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating outlet:', error);
      throw error;
    }
  }
}
