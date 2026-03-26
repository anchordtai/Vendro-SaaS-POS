"use client";

import { useState } from "react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
}

export default function ReceiptModal({ isOpen, onClose, receiptData }: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !receiptData) return null;

  const formatReceipt = (data: any) => {
    const receipt = [];
    
    // Header
    receipt.push('================================');
    receipt.push(data.print_header || 'SALES RECEIPT');
    receipt.push('================================');
    receipt.push('');
    
    // Business info
    receipt.push('Your Business Name');
    receipt.push('Address, City');
    receipt.push('Phone: +234 XXX XXX XXXX');
    receipt.push('');
    
    // Receipt details
    receipt.push(`Receipt #: ${data.receipt_number}`);
    receipt.push(`Date: ${new Date().toLocaleString()}`);
    receipt.push(`Cashier: ${data.cashier_name || 'System'}`);
    receipt.push('--------------------------------');
    receipt.push('ITEMS');
    receipt.push('--------------------------------');
    
    // Items
    data.items?.forEach((item: any) => {
      const name = item.product_name || item.name;
      const qty = item.quantity.toString().padStart(4);
      const price = `₦${item.unit_price.toFixed(2)}`.padStart(10);
      const total = `₦${item.total_price.toFixed(2)}`.padStart(10);
      
      receipt.push(name);
      receipt.push(`  Qty: ${qty}  Price: ${price}`);
      receipt.push(`              Total: ${total}`);
      receipt.push('');
    });
    
    // Totals
    receipt.push('--------------------------------');
    receipt.push(`Subtotal: ₦${data.subtotal?.toFixed(2) || '0.00'}`);
    receipt.push('--------------------------------');
    receipt.push(`TOTAL: ₦${data.total_amount?.toFixed(2) || '0.00'}`);
    receipt.push('--------------------------------');
    
    // Payment
    receipt.push(`Payment: ${data.payment_method?.toUpperCase() || 'CASH'}`);
    receipt.push('');
    
    // Footer
    receipt.push(data.print_footer || 'Thank you for your business!');
    receipt.push('================================');
    
    return receipt.join('\n');
  };

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptContent = formatReceipt(receiptData);
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${receiptData.receipt_number}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                white-space: pre;
                padding: 20px;
                margin: 0;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>${receiptContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 500);
    } else {
      setIsPrinting(false);
      alert('Please allow popups to print receipts');
    }
  };

  const handleDownloadPDF = () => {
    // For PDF download, we'll create a simple text file for now
    // In production, you'd use a PDF library like jsPDF
    const receiptContent = formatReceipt(receiptData);
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptData.receipt_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const receiptContent = formatReceipt(receiptData);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Receipt</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6 bg-gray-50">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <pre className="text-xs font-mono text-gray-800 whitespace-pre">
              {receiptContent}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPrinting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Printing...
                </>
              ) : (
                <>
                  🖨️ Print Receipt
                </>
              )}
            </button>
            
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg flex items-center gap-2"
            >
              📄 Download Receipt
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
