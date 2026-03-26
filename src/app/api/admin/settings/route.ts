import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET system settings
export async function GET() {
  try {
    // In a real implementation, these would be stored in a settings table
    // For now, return default settings
    const settings = {
      system: {
        platformName: 'Vendro POS',
        defaultCurrency: 'NGN',
        defaultTaxRate: 7.5,
        sessionTimeout: 30,
        maintenanceMode: false,
        debugMode: false
      },
      email: {
        smtpServer: '',
        smtpPort: 587,
        username: '',
        password: '',
        fromEmail: 'noreply@vendro.com',
        fromName: 'Vendro POS'
      },
      security: {
        twoFactorAuth: true,
        sessionMonitoring: true,
        apiRateLimiting: false,
        backupEncryption: true,
        passwordMinLength: 8,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      backup: {
        frequency: 'daily',
        retentionPeriod: 30,
        location: 'local',
        encryption: true,
        autoBackup: true
      },
      features: {
        enableRegistration: true,
        enableSubscriptions: true,
        enableTrialPeriod: true,
        trialDuration: 14,
        maxTenantsPerPlan: {
          basic: 1,
          pro: 5,
          enterprise: -1 // unlimited
        }
      },
      limits: {
        maxUsersPerTenant: 50,
        maxProductsPerTenant: 1000,
        maxCustomersPerTenant: 5000,
        maxSalesPerDay: 10000
      }
    };

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update system settings
export async function PUT(request: Request) {
  try {
    const settings = await request.json();

    // In a real implementation, these would be saved to a settings table
    // For now, just validate and return success
    
    console.log('Updating system settings:', settings);

    // Validate critical settings
    if (settings.system?.sessionTimeout < 5 || settings.system?.sessionTimeout > 480) {
      return NextResponse.json({ error: 'Session timeout must be between 5 and 480 minutes' }, { status: 400 });
    }

    if (settings.security?.passwordMinLength < 6) {
      return NextResponse.json({ error: 'Password minimum length must be at least 6 characters' }, { status: 400 });
    }

    if (settings.backup?.retentionPeriod < 1 || settings.backup?.retentionPeriod > 365) {
      return NextResponse.json({ error: 'Backup retention period must be between 1 and 365 days' }, { status: 400 });
    }

    // Simulate saving settings
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
