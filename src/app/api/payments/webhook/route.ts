import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment-service';
import { createHash } from 'crypto';
import { headers } from 'next/headers';

// Security constants
const WEBHOOK_TIMEOUT = 30000; // 30 seconds
const MAX_WEBHOOK_SIZE = 1024 * 1024; // 1MB

// Validate webhook signature
function validateWebhookSignature(body: string, signature: string): boolean {
  const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secretHash) {
    console.error('Flutterwave webhook hash not configured');
    return false;
  }
  
  return signature === secretHash;
}

// Check if request is from allowed IP
function isAllowedSource(requestIp?: string): boolean {
  if (!requestIp) return true; // Allow if IP not available
  
  // Flutterwave webhook IPs (add actual IPs from Flutterwave documentation)
  const allowedIps = [
    '52.31.139.75',
    '52.49.173.169', 
    '52.214.14.77',
    // Add more IPs as needed
  ];
  
  return allowedIps.includes(requestIp);
}

// Rate limiting for webhooks
const webhookAttempts = new Map<string, { count: number; resetTime: number }>();

function checkWebhookRateLimit(sourceIp: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 100;
  
  const attempts = webhookAttempts.get(sourceIp) || { count: 0, resetTime: now + windowMs };
  
  if (now > attempts.resetTime) {
    // Reset window
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }
  
  if (attempts.count >= maxAttempts) {
    return false;
  }
  
  attempts.count++;
  webhookAttempts.set(sourceIp, attempts);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get request headers
    const headersList = headers();
    const signature = headersList.get('verif-hash') || headersList.get('x-flutterwave-signature');
    const clientIp = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown';
    
    // Security checks
    if (!isAllowedSource(clientIp)) {
      console.warn(`Unauthorized webhook attempt from IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Unauthorized source' },
        { status: 403 }
      );
    }
    
    if (!checkWebhookRateLimit(clientIp)) {
      console.warn(`Webhook rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Check content size
    const contentLength = parseInt(headersList.get('content-length') || '0');
    if (contentLength > MAX_WEBHOOK_SIZE) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }
    
    // Read and validate body
    const body = await request.text();
    
    if (!body) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }
    
    // Validate signature
    if (!signature || !validateWebhookSignature(body, signature)) {
      console.error(`Invalid webhook signature from IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // Parse webhook data
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (parseError) {
      console.error('Invalid JSON in webhook body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }
    
    // Validate webhook structure
    if (!webhookData.event || !webhookData.data) {
      return NextResponse.json(
        { error: 'Invalid webhook structure' },
        { status: 400 }
      );
    }
    
    // Process webhook with timeout
    const webhookPromise = PaymentService.handleWebhook(webhookData, clientIp);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Webhook processing timeout')), WEBHOOK_TIMEOUT)
    );
    
    await Promise.race([webhookPromise, timeoutPromise]);
    
    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed successfully in ${processingTime}ms for event: ${webhookData.event}`);
    
    // Return success response
    return NextResponse.json({
      status: 'success',
      message: 'Webhook processed successfully',
      processing_time_ms: processingTime
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Don't expose internal errors to webhook provider
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Webhook processing failed'
      },
      { status: 500 }
    );
  }
}

// Handle webhook verification (GET request for testing)
export async function GET(request: NextRequest) {
  const headersList = headers();
  const clientIp = headersList.get('x-forwarded-for') || 
                  headersList.get('x-real-ip') || 
                  'unknown';
  
  return NextResponse.json({
    message: 'Vendro POS Payment Webhook Endpoint',
    status: 'active',
    security: {
      signature_validation: 'enabled',
      ip_whitelisting: 'enabled',
      rate_limiting: 'enabled',
      timeout_protection: `${WEBHOOK_TIMEOUT}ms`
    },
    client_info: {
      ip: clientIp,
      user_agent: headersList.get('user-agent') || 'unknown'
    },
    supported_events: [
      'charge.completed',
      'charge.failed',
      'payment.successful',
      'payment.failed'
    ]
  });
}

// Handle webhook health check
export async function PUT() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
