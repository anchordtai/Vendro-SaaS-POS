import { supabase } from './supabase';
import type { Plan, Subscription } from '@/types/saas';

export interface FlutterwavePaymentRequest {
  amount: number;
  currency: string;
  email: string;
  tx_ref: string;
  callback_url: string;
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
}

export interface FlutterwaveResponse {
  status: string;
  message: string;
  data: {
    link: string;
    tx_ref: string;
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
  };
}

export class PaymentService {
  private static readonly FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
  private static readonly FLUTTERWAVE_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';
  private static readonly BASE_URL = 'https://api.flutterwave.com/v3';

  // Initialize payment with Flutterwave
  static async initializePayment(paymentData: {
    planId: string;
    tenantId: string;
    billingCycle: 'monthly' | 'yearly';
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
  }): Promise<{ paymentUrl: string; transactionRef: string }> {
    try {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', paymentData.planId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      // Calculate amount
      const amount = paymentData.billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

      // Generate transaction reference
      const tx_ref = `VENDRO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store pending transaction
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
          created_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      // Prepare Flutterwave request
      const paymentRequest: FlutterwavePaymentRequest = {
        amount,
        currency: 'NGN',
        email: paymentData.customerEmail,
        tx_ref: tx_ref,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
        customer: {
          name: paymentData.customerName,
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone
        },
        customizations: {
          title: 'Vendro POS Subscription',
          description: `${plan.name} - ${paymentData.billingCycle} subscription`,
          logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
        }
      };

      // Make request to Flutterwave
      const response = await fetch(`${this.BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentRequest)
      });

      const flutterwaveResponse: FlutterwaveResponse = await response.json();

      if (flutterwaveResponse.status !== 'success') {
        throw new Error(flutterwaveResponse.message);
      }

      return {
        paymentUrl: flutterwaveResponse.data.link,
        transactionRef: tx_ref
      };
    } catch (error) {
      console.error('Error initializing payment:', error);
      throw error;
    }
  }

  // Verify payment with Flutterwave
  static async verifyPayment(transactionId: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/transactions/${transactionId}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const verificationResponse: PaymentVerificationResponse = await response.json();

      if (verificationResponse.status !== 'success') {
        throw new Error(verificationResponse.message);
      }

      return verificationResponse;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Process successful payment and update subscription
  static async processSuccessfulPayment(verificationData: PaymentVerificationResponse): Promise<void> {
    try {
      const tx_ref = verificationData.data.tx_ref;
      
      // Get pending transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('tx_ref', tx_ref)
        .single();

      if (transactionError || !transaction) {
        throw new Error('Transaction not found');
      }

      // Update transaction status
      await supabase
        .from('pending_transactions')
        .update({
          status: 'completed',
          flutterwave_tx_id: verificationData.data.id.toString(),
          flutterwave_flw_ref: verificationData.data.flw_ref,
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Store payment record
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
          created_at: new Date().toISOString()
        });

      console.log('Payment processed successfully for tenant:', transaction.tenant_id);
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  // Handle webhook from Flutterwave
  static async handleWebhook(webhookData: any): Promise<void> {
    try {
      // Verify webhook signature (recommended)
      const signature = webhookData['verif-hash'];
      if (signature !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
        throw new Error('Invalid webhook signature');
      }

      const eventType = webhookData['event'];
      const eventData = webhookData['data'];

      switch (eventType) {
        case 'charge.completed':
          if (eventData.status === 'successful') {
            await this.processSuccessfulPayment({
              status: 'success',
              message: 'Payment successful',
              data: eventData
            });
          }
          break;
        
        case 'payment.failed':
          // Update transaction status to failed
          await supabase
            .from('pending_transactions')
            .update({
              status: 'failed',
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

  // Cancel subscription
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

  // Get payment history for tenant
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

  // Check if subscription needs renewal
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

      return daysUntilExpiry <= 7; // Renewal needed within 7 days
    } catch (error) {
      console.error('Error checking subscription renewal:', error);
      return false;
    }
  }
}
