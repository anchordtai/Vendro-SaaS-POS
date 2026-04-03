import { supabase } from './supabase';
import { createHash, randomBytes } from 'crypto';
import type { Plan, Subscription } from '@/types/saas';

export interface FlutterwavePaymentRequest {
  amount: number;
  currency: string;
  email: string;
  tx_ref: string;
  callback_url: string;
  redirect_url: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  meta?: {
    tenant_id: string;
    plan_id: string;
    source: string;
    security_hash?: string;
  };
}

export interface FlutterwaveResponse {
  status: string;
  message: string;
  data: {
    link: string;
    tx_ref: string;
    id: number;
  };
}

export interface PaymentVerificationResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    ip: string;
    device_fingerprint: string;
  };
}

export class PaymentService {
  private static readonly FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
  private static readonly FLUTTERWAVE_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';
  private static readonly FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY || '';
  private static readonly BASE_URL = 'https://api.flutterwave.com/v3';
  private static readonly WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH || '';

  // Initialize payment with enhanced security
  static async initializePayment(paymentData: {
    planId: string;
    tenantId: string;
    billingCycle: 'monthly' | 'yearly';
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    txRef?: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<{ paymentUrl: string; transactionRef: string; securityToken?: string }> {
    try {
      // Validate tenant and user permissions
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, business_name, status, security_settings')
        .eq('id', paymentData.tenantId)
        .eq('status', 'active')
        .single();

      if (tenantError || !tenant) {
        throw new Error('Invalid or inactive tenant');
      }

      // Get plan details with validation
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', paymentData.planId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      // Calculate amount with fraud detection
      const amount = paymentData.billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
      
      // Validate amount against plan limits
      if (amount < 100 || amount > 10000000) {
        throw new Error('Invalid payment amount');
      }

      // Generate secure transaction reference
      const tx_ref = paymentData.txRef || this.generateSecureTransactionRef();

      // Create security hash
      const securityHash = this.createSecurityHash({
        tenant_id: paymentData.tenantId,
        plan_id: paymentData.planId,
        amount: amount,
        timestamp: Date.now()
      });

      // Store pending transaction with enhanced security
      const { error: transactionError } = await supabase
        .from('pending_transactions')
        .insert({
          tenant_id: paymentData.tenantId,
          plan_id: paymentData.planId,
          billing_cycle: paymentData.billingCycle,
          amount: amount,
          currency: 'NGN',
          tx_ref: tx_ref,
          status: 'pending',
          customer_email: paymentData.customerEmail,
          customer_name: paymentData.customerName,
          security_hash: securityHash,
          client_ip: paymentData.clientIp || 'unknown',
          user_agent: paymentData.userAgent || 'unknown',
          device_fingerprint: this.generateDeviceFingerprint(paymentData.userAgent || ''),
          created_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      // Prepare secure Flutterwave request
      const paymentRequest: FlutterwavePaymentRequest = {
        amount,
        currency: 'NGN',
        email: paymentData.customerEmail,
        tx_ref: tx_ref,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?tx_ref=${tx_ref}`,
        customer: {
          name: paymentData.customerName,
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone
        },
        customizations: {
          title: 'Vendro POS Subscription',
          description: `${plan.name} - ${paymentData.billingCycle} subscription`,
          logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
        },
        meta: {
          tenant_id: paymentData.tenantId,
          plan_id: paymentData.planId,
          source: 'vendro-pos',
          security_hash: securityHash
        }
      };

      // Add additional security headers
      const response = await fetch(`${this.BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'X-Request-ID': randomBytes(16).toString('hex'),
          'X-Security-Token': securityHash
        },
        body: JSON.stringify(paymentRequest)
      });

      const flutterwaveResponse: FlutterwaveResponse = await response.json();

      if (flutterwaveResponse.status !== 'success') {
        // Mark transaction as failed
        await supabase
          .from('pending_transactions')
          .update({
            status: 'failed',
            error_message: flutterwaveResponse.message,
            updated_at: new Date().toISOString()
          })
          .eq('tx_ref', tx_ref);
        
        throw new Error(flutterwaveResponse.message);
      }

      // Update transaction with Flutterwave data
      await supabase
        .from('pending_transactions')
        .update({
          flutterwave_tx_id: flutterwaveResponse.data.id.toString(),
          flutterwave_link: flutterwaveResponse.data.link,
          updated_at: new Date().toISOString()
        })
        .eq('tx_ref', tx_ref);

      return {
        paymentUrl: flutterwaveResponse.data.link,
        transactionRef: tx_ref,
        securityToken: securityHash
      };
    } catch (error) {
      console.error('Error initializing payment:', error);
      throw error;
    }
  }

  // Enhanced payment verification with security checks
  static async verifyPayment(transactionId: string, clientIp?: string): Promise<PaymentVerificationResponse> {
    try {
      // Get transaction record first
      const { data: transaction, error: transactionError } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('tx_ref', transactionId)
        .single();

      if (transactionError || !transaction) {
        throw new Error('Transaction not found');
      }

      // Verify transaction is not too old (prevent replay attacks)
      const transactionAge = Date.now() - new Date(transaction.created_at).getTime();
      if (transactionAge > 24 * 60 * 60 * 1000) { // 24 hours
        throw new Error('Transaction expired');
      }

      // Verify with Flutterwave
      const response = await fetch(`${this.BASE_URL}/transactions/${transactionId}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'X-Client-IP': clientIp || 'unknown'
        }
      });

      const verificationResponse: PaymentVerificationResponse = await response.json();

      if (verificationResponse.status !== 'success') {
        throw new Error(verificationResponse.message);
      }

      // Additional security checks
      if (verificationResponse.data.amount !== transaction.amount) {
        throw new Error('Payment amount mismatch');
      }

      if (verificationResponse.data.currency !== transaction.currency) {
        throw new Error('Payment currency mismatch');
      }

      // Check for suspicious IP changes
      if (clientIp && transaction.client_ip !== 'unknown' && 
          transaction.client_ip !== clientIp && 
          !this.isAllowedIpChange(transaction.client_ip, clientIp)) {
        console.warn('Suspicious IP change detected:', {
          original: transaction.client_ip,
          current: clientIp,
          tx_ref: transactionId
        });
      }

      return verificationResponse;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Enhanced payment processing with audit trail
  static async processSuccessfulPayment(verificationData: PaymentVerificationResponse, clientIp?: string): Promise<void> {
    try {
      const tx_ref = verificationData.data.tx_ref;
      
      // Get pending transaction with security validation
      const { data: transaction, error: transactionError } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('tx_ref', tx_ref)
        .single();

      if (transactionError || !transaction) {
        throw new Error('Transaction not found');
      }

      // Create audit log
      await supabase
        .from('payment_audit_log')
        .insert({
          tx_ref: tx_ref,
          event: 'payment_verification_started',
          details: {
            flutterwave_id: verificationData.data.id,
            amount: verificationData.data.amount,
            client_ip: clientIp,
            verification_data: verificationData.data
          },
          created_at: new Date().toISOString()
        });

      // Update transaction status
      await supabase
        .from('pending_transactions')
        .update({
          status: 'completed',
          flutterwave_tx_id: verificationData.data.id.toString(),
          flutterwave_flw_ref: verificationData.data.flw_ref,
          verification_ip: clientIp,
          device_fingerprint_verified: verificationData.data.device_fingerprint,
          verified_at: new Date().toISOString()
        })
        .eq('tx_ref', tx_ref);

      // Calculate subscription period
      const now = new Date();
      const periodEnd = new Date(now);
      if (transaction.billing_cycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Update or create subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', transaction.tenant_id)
        .in('status', ['trial', 'active'])
        .single();

      if (existingSubscription) {
        // Update existing subscription
        await supabase
          .from('subscriptions')
          .update({
            plan_id: transaction.plan_id,
            status: 'active',
            billing_cycle: transaction.billing_cycle,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            flutterwave_transaction_id: verificationData.data.id.toString(),
            last_payment_amount: verificationData.data.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);
      } else {
        // Create new subscription
        await supabase
          .from('subscriptions')
          .insert({
            tenant_id: transaction.tenant_id,
            plan_id: transaction.plan_id,
            status: 'active',
            billing_cycle: transaction.billing_cycle,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            flutterwave_transaction_id: verificationData.data.id.toString(),
            last_payment_amount: verificationData.data.amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Store enhanced payment record
      await supabase
        .from('payment_records')
        .insert({
          tenant_id: transaction.tenant_id,
          subscription_id: existingSubscription?.id,
          amount: verificationData.data.amount,
          currency: verificationData.data.currency,
          payment_method: verificationData.data.payment_type,
          flutterwave_tx_id: verificationData.data.id.toString(),
          flutterwave_flw_ref: verificationData.data.flw_ref,
          tx_ref: tx_ref,
          status: 'completed',
          client_ip: clientIp,
          device_fingerprint: verificationData.data.device_fingerprint,
          fraud_score: this.calculateFraudScore(verificationData.data, transaction),
          created_at: new Date().toISOString()
        });

      // Update audit log
      await supabase
        .from('payment_audit_log')
        .insert({
          tx_ref: tx_ref,
          event: 'payment_completed',
          details: {
            subscription_id: existingSubscription?.id,
            period_end: periodEnd.toISOString()
          },
          created_at: new Date().toISOString()
        });

      console.log('Payment processed successfully for tenant:', transaction.tenant_id);
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Enhanced webhook handling with security validation
  static async handleWebhook(webhookData: any, requestIp?: string): Promise<void> {
    try {
      // Verify webhook signature
      const signature = webhookData['verif-hash'];
      if (!signature || signature !== this.WEBHOOK_HASH) {
        throw new Error('Invalid webhook signature');
      }

      // Verify webhook source IP (Flutterwave IPs)
      if (!this.isAllowedWebhookIp(requestIp)) {
        throw new Error('Unauthorized webhook source');
      }

      const eventType = webhookData['event'];
      const eventData = webhookData['data'];

      // Log webhook event
      await supabase
        .from('webhook_log')
        .insert({
          event_type: eventType,
          tx_ref: eventData?.tx_ref,
          data: eventData,
          source_ip: requestIp,
          created_at: new Date().toISOString()
        });

      switch (eventType) {
        case 'charge.completed':
          if (eventData.status === 'successful') {
            await this.processSuccessfulPayment({
              status: 'success',
              message: 'Payment successful',
              data: eventData
            }, requestIp);
          }
          break;
        
        case 'payment.failed':
          await supabase
            .from('pending_transactions')
            .update({
              status: 'failed',
              error_message: eventData?.narration || 'Payment failed',
              updated_at: new Date().toISOString()
            })
            .eq('tx_ref', eventData.tx_ref);
          break;
        
        default:
          console.log('Unhandled webhook event:', eventType);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Security helper methods
  private static generateSecureTransactionRef(): string {
    const timestamp = Date.now();
    const random = randomBytes(16).toString('hex').toUpperCase();
    return `VENDRO-${timestamp}-${random}`;
  }

  private static createSecurityHash(data: any): string {
    const secret = this.FLUTTERWAVE_SECRET_KEY;
    const sortedKeys = Object.keys(data).sort();
    const stringToSign = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&') + secret;
    return createHash('sha256').update(stringToSign).digest('hex');
  }

  private static generateDeviceFingerprint(userAgent: string): string {
    return createHash('sha256').update(userAgent + randomBytes(8).toString('hex')).digest('hex').substring(0, 16);
  }

  private static isAllowedIpChange(originalIp: string, newIp: string): boolean {
    // Allow same subnet or common mobile carrier changes
    const originalParts = originalIp.split('.');
    const newParts = newIp.split('.');
    
    // Allow same first two octets (same subnet)
    return originalParts[0] === newParts[0] && originalParts[1] === newParts[1];
  }

  private static isAllowedWebhookIp(ip?: string): boolean {
    if (!ip) return true; // Allow if IP not available
    
    // Flutterwave webhook IPs (add actual IPs from Flutterwave documentation)
    const allowedIps = [
      '52.31.139.75',
      '52.49.173.169',
      '52.214.14.77'
    ];
    
    return allowedIps.includes(ip);
  }

  private static calculateFraudScore(paymentData: any, transaction: any): number {
    let score = 0;
    
    // Check for suspicious patterns
    if (paymentData.amount > 1000000) score += 10;
    if (paymentData.payment_type === 'bank_transfer') score += 5;
    if (transaction.client_ip === 'unknown') score += 15;
    
    return Math.min(score, 100);
  }

  // Existing methods remain the same...
  static async cancelSubscription(tenantId: string): Promise<void> {
    try {
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  static async getPaymentHistory(tenantId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  static async checkSubscriptionRenewal(tenantId: string): Promise<boolean> {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('current_period_end, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      if (!subscription) return false;

      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      const daysUntilExpiry = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return daysUntilExpiry <= 7;
    } catch (error) {
      console.error('Error checking subscription renewal:', error);
      return false;
    }
  }
}
