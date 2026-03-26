"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReceiptModal from "@/components/ReceiptModal";

export default function POSDashboard() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const router = useRouter();

  const USD_TO_NGN = 1600;

  const convertToNaira = (usdAmount: number) => {
    return usdAmount * USD_TO_NGN;
  };

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  useEffect(() => {
    try {
      const sessionData = localStorage.getItem('vendro_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setUser(session.user);
        
        // Check if user has POS access
        if (session.user.role !== 'cashier' && session.user.role !== 'tenant_admin') {
          router.push('/dashboard');
          return;
        }
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Error loading session:', error);
      router.push('/login');
      return;
    }

    loadProducts();
  }, [router]);

  const loadProducts = async () => {
    try {
      const sessionData = localStorage.getItem('vendro_session');
      if (!sessionData) return;
      
      const session = JSON.parse(sessionData);
      const tenantId = session.user.tenant_id;

      const response = await fetch(`/api/products?tenant_id=${tenantId}`);
      const data = await response.json();
      setProducts(data.products || []);

    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: any) => {
    if (product.stock_quantity <= 0) {
      alert('Product is out of stock');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTax = () => {
    return getTotal() * 0.05; // 5% tax
  };

  const getGrandTotal = () => {
    return getTotal(); // No tax - grand total equals subtotal
  };

  const processPayment = async (method: string) => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setProcessingPayment(true);
    try {
      const sessionData = localStorage.getItem('vendro_session');
      const session = JSON.parse(sessionData);

      const saleData = {
        tenant_id: session.user.tenant_id,
        user_id: session.user.id,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price
        })),
        customer_name: 'Walk-in Customer',
        payment_method: method
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Prepare receipt data for modal
        const receiptInfo = {
          receipt_number: result.sale.receipt_number,
          items: cart.map(item => ({
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity
          })),
          subtotal: result.sale.subtotal,
          total_amount: result.sale.total_amount,
          payment_method: method,
          cashier_name: session.user.name || 'System',
          print_header: 'SALES RECEIPT',
          print_footer: 'Thank you for your business!'
        };
        
        // Show receipt modal
        setReceiptData(receiptInfo);
        setShowReceiptModal(true);
        
        // Also print to terminal (existing functionality)
        await printReceipt(result.sale);
        
        setCart([]);
        loadProducts(); // Reload to update inventory
      } else {
        const error = await response.json();
        alert(`Payment failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const printReceipt = async (sale: any) => {
    try {
      const receiptData = {
        receipt_number: sale.receipt_number,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: formatNaira(item.price),
          total: formatNaira(item.price * item.quantity)
        })),
        subtotal: formatNaira(getTotal()),
        tax: formatNaira(getTax()),
        total: formatNaira(getGrandTotal()),
        payment_method: sale.payment_method,
        date: new Date().toLocaleString(),
        cashier: user?.name
      };

      // Send to thermal printer
      const response = await fetch('/api/print/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sale_id: sale.id,
          receipt_data: receiptData
        }),
      });

      if (!response.ok) {
        console.error('Failed to print receipt');
      }
    } catch (error) {
      console.error('Receipt printing error:', error);
    }
  };

  const scanBarcode = () => {
    setScanningBarcode(true);
    setTimeout(() => {
      const barcode = prompt('Enter barcode (or scan with barcode scanner):');
      if (barcode) {
        const product = products.find(p => p.barcode === barcode);
        if (product) {
          addToCart(product);
          alert(`Added ${product.name} to cart`);
        } else {
          alert('Product not found for this barcode');
        }
      }
      setScanningBarcode(false);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">Point of Sale</h1>
              <p className="text-green-200 text-xs sm:text-sm truncate">Cashier: {user?.name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-2">
              <button
                onClick={scanBarcode}
                disabled={scanningBarcode}
                className="px-2 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg disabled:opacity-50 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">{scanningBarcode ? '📷 Scanning...' : '📷 Scan Barcode'}</span>
                <span className="sm:hidden">{scanningBarcode ? '📷' : '📷'}</span>
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('vendro_session');
                  router.push('/login');
                }}
                className="px-2 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">🚪 Logout</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-70px)]">
        {/* Products Section */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-black/20 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Products</h2>
              <p className="text-gray-400 text-xs sm:text-sm">Select items to add to cart</p>
            </div>
            <div className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`bg-white/5 backdrop-blur border rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer ${
                      product.stock_quantity <= 0 ? 'border-red-500/30 opacity-50' : 'border-white/10'
                    }`}
                    onClick={() => addToCart(product)}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <span className="text-lg sm:text-2xl">�</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white truncate mb-1">{product.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-400 mb-2 truncate">{product.sku}</p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm sm:text-base font-bold text-green-400">{formatNaira(product.price)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.stock_quantity <= 0 ? 'bg-red-500/20 text-red-300' :
                          product.stock_quantity <= product.low_stock_threshold ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {product.stock_quantity <= 0 ? 'Out' : product.stock_quantity}
                        </span>
                      </div>
                      <button className="w-full px-2 sm:px-3 py-1 sm:py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-xs sm:text-sm font-medium">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96 bg-black/20 backdrop-blur-lg border-l lg:border-l border-t lg:border-t border-white/10">
          <div className="p-3 sm:p-6 h-full flex flex-col">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Shopping Cart</h2>
              <p className="text-gray-400 text-xs sm:text-sm">{cart.length} items</p>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto mb-4 sm:mb-6">
              {cart.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <span className="text-4xl sm:text-6xl mb-4 block opacity-50">🛒</span>
                  <p className="text-gray-400 text-sm sm:text-base">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {cart.map((item, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white truncate pr-2">{item.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-400">{formatNaira(item.price)} each</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 ml-2"
                        >
                          <span className="text-lg sm:text-xl">×</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <span className="text-sm sm:text-base">−</span>
                          </button>
                          <span className="text-sm sm:text-base font-medium text-white w-6 sm:w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <span className="text-sm sm:text-base">+</span>
                          </button>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-green-400">{formatNaira(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            <div className="border-t border-white/10 pt-4 sm:pt-6">
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white font-medium">{formatNaira(getTotal())}</span>
                </div>
                <div className="flex justify-between text-lg sm:text-xl font-bold">
                  <span className="text-white">Total:</span>
                  <span className="text-green-400">{formatNaira(getGrandTotal())}</span>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={() => processPayment('cash')}
                  disabled={cart.length === 0 || processingPayment}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPayment ? 'Processing...' : '💵 Cash Payment'}
                </button>
                <button
                  onClick={() => processPayment('card')}
                  disabled={cart.length === 0 || processingPayment}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPayment ? 'Processing...' : '💳 Card Payment'}
                </button>
                <button
                  onClick={() => processPayment('mobile')}
                  disabled={cart.length === 0 || processingPayment}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPayment ? 'Processing...' : '📱 Mobile Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receiptData={receiptData}
      />
    </div>
  );
}
