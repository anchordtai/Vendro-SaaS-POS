import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');
    const tx_ref = searchParams.get('tx_ref');
    const status = searchParams.get('status');

    if (!transaction_id || !tx_ref) {
      return NextResponse.redirect(
        new URL('/payment/failed?reason=missing_params', request.url)
      );
    }

    if (status === 'successful') {
      try {
        // Verify the payment
        const verificationData = await PaymentService.verifyPayment(transaction_id);
        
        if (verificationData.data.status === 'successful') {
          // Process the successful payment
          await PaymentService.processSuccessfulPayment(verificationData);
          
          return NextResponse.redirect(
            new URL('/payment/success?tx_ref=' + tx_ref, request.url)
          );
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
      }
    }

    return NextResponse.redirect(
      new URL('/payment/failed?tx_ref=' + tx_ref, request.url)
    );
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL('/payment/failed?reason=server_error', request.url)
    );
  }
}
