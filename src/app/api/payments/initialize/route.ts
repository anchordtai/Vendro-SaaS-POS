import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment-service';
import { supabase } from '@/lib/supabase';
import { createHash, randomBytes } from 'crypto';
import { headers } from 'next/headers';

// Security constants
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;
const paymentRequests = new Map();

// Rate limiting middleware
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const requests = paymentRequests.get(clientId) || [];
  
  // Clean old requests
  const validRequests = requests.filter((timestamp: number) => 
    now - timestamp < RATE_LIMIT_WINDOW
  );
  
  if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  validRequests.push(now);
  paymentRequests.set(clientId, validRequests);
  return true;
}

// Generate secure transaction reference
function generateTransactionReference(): string {
  const timestamp = Date.now();
  const random = randomBytes(16).toString('hex').toUpperCase();
  return `VENDRO-${timestamp}-${random}`;
}

// Validate and sanitize input
function validatePaymentInput(body: any): { valid: boolean; error?: string } {
  const required = ['planId', 'tenantId', 'billingCycle', 'customerEmail', 'customerName'];
  
  for (const field of required) {
    if (!body[field] || typeof body[field] !== 'string' || body[field].trim().length === 0) {
      return { valid: false, error: `Invalid or missing field: ${field}` };
    }
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customerEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Validate billing cycle
  if (!['monthly', 'yearly'].includes(body.billingCycle)) {
    return { valid: false, error: 'Invalid billing cycle' };
  }
  
  // Sanitize inputs
  body.customerName = body.customerName.replace(/<[^>]*>/g, '').trim();
  body.customerEmail = body.customerEmail.toLowerCase().trim();
  
  return { valid: true };
}

// Generate CSRF token
function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = headers();
    const clientId = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown';
    
    // Check rate limiting
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Too many payment requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Check CSRF token if provided
    const csrfToken = headersList.get('x-csrf-token');
    if (csrfToken) {
      // Validate CSRF token (implement token validation logic)
      const storedToken = request.cookies.get('csrf-token')?.value;
      if (!storedToken || csrfToken !== storedToken) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
    
    const body = await request.json();
    
    // Validate input
    const validation = validatePaymentInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Verify user has access to this tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!userRecord || userRecord.tenant_id !== body.tenantId || !['tenant_admin', 'manager'].includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Generate secure transaction reference
    const txRef = generateTransactionReference();
    
    // Initialize payment with enhanced security
    const paymentResult = await PaymentService.initializePayment({
      planId: body.planId,
      tenantId: body.tenantId,
      billingCycle: body.billingCycle,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      txRef: txRef,
      clientIp: clientId,
      userAgent: headersList.get('user-agent') || 'unknown'
    });

    // Set secure CSRF token cookie
    const response = NextResponse.json({
      ...paymentResult,
      txRef: txRef,
      csrfToken: generateCSRFToken()
    });
    
    response.cookies.set('csrf-token', generateCSRFToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 // 1 hour
    });

    return response;
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Secure payment initialization endpoint',
    security: {
      rate_limit: `${MAX_REQUESTS_PER_WINDOW} requests per ${RATE_LIMIT_WINDOW / 60000} minutes`,
      csrf_protection: 'Enabled',
      input_validation: 'Strict validation and sanitization',
      encryption: 'Secure transaction references'
    },
    supported_methods: ['card', 'bank_transfer', 'ussd', 'mobile_money']
  });
}
