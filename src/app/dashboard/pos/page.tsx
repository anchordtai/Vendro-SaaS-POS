"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiSearch,
  FiPlus,
  FiMinus,
  FiX,
  FiShoppingCart,
  FiPrinter,
  FiGrid,
  FiList,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiPackage,
  FiCreditCard,
  FiDollarSign,
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";
import { useAuthStore } from "@/lib/auth-store";
import { useCartStore } from "@/lib/cart-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { thermalPrinter } from "@/lib/thermal-printer";
import { useRouter } from "next/navigation";
import { getAllProducts, getProductByBarcode, saveSale, addPendingSync, clearAllData } from "@/lib/indexeddb";

interface CartItem {
  product: any;
  quantity: number;
  subtotal: number;
}

export default function POSPage() {
  const { user, isAuthenticated, isOfflineMode } = useAuthStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getTax, getTotal } = useCartStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    
    // Focus on barcode input for easy scanning
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const loadProducts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Clear cached data if force refresh
      if (forceRefresh) {
        await clearAllData();
      }
      
      const allProducts = await getAllProducts();
      
      // Always try to fetch from Supabase if online
      if (!isOfflineMode) {
        const { data: productsData, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', true)
          .order('name', { ascending: true });
          
        if (!error && productsData) {
          setProducts(productsData);
          // Save to IndexedDB for offline use
          const { saveProducts } = await import('@/lib/indexeddb');
          await saveProducts(productsData);
        } else {
          // Fallback to IndexedDB if Supabase fails
          setProducts(allProducts);
        }
      } else {
        setProducts(allProducts);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      // Try to load from IndexedDB as fallback
      const fallbackProducts = await getAllProducts();
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async () => {
    if (!barcodeInput.trim()) return;
    
    try {
      const product = await getProductByBarcode(barcodeInput.trim());
      if (product) {
        if (product.stock_quantity > 0) {
          addItem(product);
          setBarcodeInput("");
          // Clear input for next scan
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = "";
          }
        } else {
          alert("Product is out of stock");
        }
      } else {
        alert("Product not found");
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      alert("Error scanning barcode");
    }
  };

  const handleCheckout = async (paymentMethod: 'cash' | 'pos_card') => {
    if (items.length === 0) return;
    
    setProcessingPayment(true);
    
    try {
      const subtotal = getSubtotal();
      const tax = getTax();
      const total = getTotal();
      
      const saleData = {
        cashier_id: user?.id,
        cashier_name: user?.name,
        total_amount: total,
        payment_method: paymentMethod,
        receipt_number: `RCP${Date.now()}`,
        created_at: new Date().toISOString(),
        items: items.map(item => ({
          id: crypto.randomUUID(), // Generate proper UUID for item
          sale_id: '', // Will be set after sale is created
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.subtotal
        }))
      };

      let saleResult: { data: { id: string } | null; error: any } | null = null;
      let finalSaleDataForDB: any = null;

      if (!isOfflineMode) {
        // Try to save to Supabase first
        console.log('Saving sale data:', saleData);
        
        saleResult = await supabase
          .from('sales')
          .insert([{
            cashier_id: saleData.cashier_id,
            cashier_name: saleData.cashier_name,
            total_amount: saleData.total_amount,
            payment_method: saleData.payment_method,
            receipt_number: saleData.receipt_number,
            created_at: saleData.created_at,
            items: saleData.items // Include items array
          }])
          .select('id')
          .single();

        if (!saleResult.data || saleResult.error) {
          console.error('Error saving sale:', saleResult.error);
          throw saleResult.error;
        }

        console.log('Sale saved successfully, updating items with sale ID...');
        
        // Update items with the actual sale ID
        const itemsWithSaleId = saleData.items.map(item => ({
          ...item,
          sale_id: saleResult.data!.id
        }));

        // Create final sale data with proper items
        finalSaleDataForDB = {
          ...saleData,
          id: saleResult.data!.id,
          items: itemsWithSaleId
        };

        // Update product stock
        for (const item of items) {
          await supabase
            .from('products')
            .update({ 
              stock_quantity: item.product.stock_quantity - item.quantity 
            })
            .eq('id', item.product.id);
        }
      } else {
        // Offline mode - save locally and mark for sync
        const offlineSaleData = {
          ...saleData,
          id: `offline_${Date.now()}` // Add ID for offline storage only
        };
        await saveSale(offlineSaleData);
        await addPendingSync({
          id: offlineSaleData.id,
          type: 'sale',
          data: offlineSaleData,
          timestamp: new Date().toISOString()
        });
      }

      // Save to IndexedDB regardless of online/offline
      const finalSaleData = isOfflineMode ? {
        ...saleData,
        id: `offline_${Date.now()}`
      } : finalSaleDataForDB || {
        ...saleData,
        id: saleResult?.data?.id || `fallback_${Date.now()}`
      };
      await saveSale(finalSaleData);

      // Print receipt
      await printReceipt(finalSaleData);

      // Clear cart
      clearCart();
      setShowCheckoutModal(false);
      
      alert(`Payment successful! Total: ${formatCurrency(total)}`);
      
    } catch (error) {
      console.error("Checkout error:", error);
      console.error("Full checkout error details:", JSON.stringify(error, null, 2));
      alert("Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const printReceipt = async (saleData: any) => {
    // Thermal printer format - plain text with proper formatting
    const thermalReceiptContent = `
========================================
           ONYXX NIGHTLIFE POS
========================================
Receipt: ${saleData.receipt_number}
Date: ${new Date(saleData.created_at).toLocaleString()}
Cashier: ${saleData.cashier_name}
Payment: ${saleData.payment_method.toUpperCase()}
========================================
ITEMS:
${saleData.items.map((item: any) => 
  `${item.product_name.padEnd(25)} ${item.quantity}x ${formatCurrency(item.price)}`
).join('\n')}
----------------------------------------
SUBTOTAL: ${formatCurrency(getSubtotal())}
TAX (5%): ${formatCurrency(getTax())}
TOTAL: ${formatCurrency(getTotal())}
========================================
Thank you for your purchase!
========================================
`;

    try {
      // Initialize thermal printer
      await thermalPrinter.initializePrinters();
      
      // Try to print with thermal printer first
      const thermalPrintSuccess = await thermalPrinter.printReceipt(thermalReceiptContent);
      
      if (thermalPrintSuccess) {
        console.log('Printed to thermal printer successfully');
        return;
      }

      // Fallback to browser print
      console.log('Using browser print fallback...');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  white-space: pre; 
                  padding: 10px; 
                  font-size: 12px;
                  width: 280px;
                  line-height: 1.2;
                }
                @media print {
                  body { margin: 0; padding: 5px; }
                }
              </style>
            </head>
            <body><pre>${thermalReceiptContent}</pre></body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Auto-print with delay for thermal printer compatibility
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    } catch (error) {
      console.error('Print error:', error);
      alert('Printing failed. Please check printer connection.');
    }
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-night-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading POS System...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["cashier", "super_admin"]}>
      <div className="flex h-screen bg-night-900">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-night-800 border-b border-night-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Point of Sale</h1>
            <div className="flex items-center gap-4">
              <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isOfflineMode 
                  ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/50' 
                  : 'bg-green-500/20 text-green-200 border border-green-500/50'
              }`}>
                {isOfflineMode ? (
                  <>
                    <FiWifiOff className="mr-2" />
                    Offline
                  </>
                ) : (
                  <>
                    <FiWifi className="mr-2" />
                    Online
                  </>
                )}
              </div>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 text-white hover:bg-night-700 rounded-lg"
              >
                {viewMode === 'grid' ? <FiList /> : <FiGrid />}
              </button>
              <button
                onClick={() => loadProducts(true)}
                disabled={loading}
                className="p-2 text-white hover:bg-night-700 rounded-lg disabled:opacity-50"
                title="Clear cache and refresh products"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Barcode Scanner */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
                placeholder="Scan barcode or enter manually"
                className="flex-1 px-4 py-2 text-white bg-night-700 border border-night-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleBarcodeScan}
                className="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <FiSearch className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 text-white bg-night-700 border border-night-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 text-white bg-night-700 border border-night-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Display */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center text-night-400 py-12">
              <FiPackage className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No products found</p>
              <p className="text-sm mt-2">Try adjusting your search or category filter</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => product.stock_quantity > 0 && addItem(product)}
                  className={`p-4 bg-night-800 border border-night-700 rounded-lg cursor-pointer transition-all hover:bg-night-700 hover:border-primary ${
                    product.stock_quantity === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex flex-col items-center justify-center mb-2">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover mb-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl ${product.image_url ? 'hidden' : ''}`}>
                      {product.image || "📦"}
                    </span>
                  </div>
                  <div className="text-white font-medium mb-2 truncate text-center">{product.name}</div>
                  <div className="text-primary font-bold text-lg text-center">{formatCurrency(product.price)}</div>
                  <div className={`text-sm text-center ${product.stock_quantity <= 5 ? 'text-red-400' : 'text-night-400'}`}>
                    Stock: {product.stock_quantity}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => product.stock_quantity > 0 && addItem(product)}
                  className={`flex items-center justify-between p-4 bg-night-800 border border-night-700 rounded-lg cursor-pointer transition-all hover:bg-night-700 hover:border-primary ${
                    product.stock_quantity === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <span className={`text-xl ${product.image_url ? 'hidden' : ''}`}>
                        {product.image || "📦"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{product.name}</div>
                      <div className={`text-sm ${product.stock_quantity <= 5 ? 'text-red-400' : 'text-night-400'}`}>
                        Stock: {product.stock_quantity}
                      </div>
                    </div>
                  </div>
                  <div className="text-primary font-bold text-lg">{formatCurrency(product.price)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-night-800 border-l border-night-700 flex flex-col">
        <div className="p-6 border-b border-night-700">
          <h2 className="text-xl font-bold text-white flex items-center justify-between">
            <span className="flex items-center">
              <FiShoppingCart className="mr-2" />
              Cart ({items.length})
            </span>
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={items.length === 0}
              className="px-3 py-1 bg-primary hover:bg-primary-600 disabled:bg-night-700 disabled:text-night-500 text-white text-sm rounded-lg transition-colors"
            >
              Checkout
            </button>
          </h2>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-night-400 py-8">
              <FiShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Cart is empty</p>
              <p className="text-sm mt-2">Add products to start selling</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="bg-night-900 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-white font-medium">{item.product.name}</div>
                      <div className="text-night-400 text-sm">{formatCurrency(item.product.price)} each</div>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      <FiX />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 bg-night-700 text-white rounded flex items-center justify-center hover:bg-night-600"
                      >
                        <FiMinus className="w-3 h-3" />
                      </button>
                      <span className="text-white w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 bg-night-700 text-white rounded flex items-center justify-center hover:bg-night-600"
                      >
                        <FiPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-primary font-bold">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-night-700">
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-white">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>Tax (5%):</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t border-night-700">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleCheckout('pos_card')}
              disabled={items.length === 0 || processingPayment}
              className="w-full py-3 bg-primary hover:bg-primary-600 disabled:bg-night-700 disabled:text-night-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
            >
              <FiCreditCard className="mr-2" />
              {processingPayment ? 'Processing...' : 'Pay with Card'}
            </button>
            <button
              onClick={() => handleCheckout('cash')}
              disabled={items.length === 0 || processingPayment}
              className="w-full py-3 bg-night-700 hover:bg-night-600 disabled:bg-night-800 disabled:text-night-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
            >
              <FiDollarSign className="mr-2" />
              {processingPayment ? 'Processing...' : 'Pay with Cash'}
            </button>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full py-2 text-red-400 hover:text-red-300 transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-night-800 rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Checkout</h3>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-white">
                <span>Items:</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Tax (5%):</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t border-night-700">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCheckout('pos_card')}
                disabled={processingPayment}
                className="flex-1 py-2 bg-primary hover:bg-primary-600 disabled:bg-night-700 disabled:text-night-500 text-white rounded-lg transition-colors"
              >
                <FiCreditCard className="inline mr-2" />
                Card
              </button>
              <button
                onClick={() => handleCheckout('cash')}
                disabled={processingPayment}
                className="flex-1 py-2 bg-night-700 hover:bg-night-600 disabled:bg-night-800 disabled:text-night-500 text-white rounded-lg transition-colors"
              >
                <FiDollarSign className="inline mr-2" />
                Cash
              </button>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 bg-night-900 hover:bg-night-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
