"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiShoppingCart,
  FiPackage,
  FiDollarSign,
  FiClock,
  FiUser,
  FiSearch,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiCreditCard,
  FiX,
  FiCheck,
  FiLogOut,
  FiSettings,
} from "react-icons/fi";
import { UserService, User } from "@/lib/user-service";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category: string;
  sku: string;
  image_url?: string;
}

interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  customer_name?: string;
  created_at: string;
}

export default function CashierDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [processingSale, setProcessingSale] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    totalTransactions: 0
  });

  const router = useRouter();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await UserService.getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Check if user is cashier or staff
      if (!['cashier', 'staff'].includes(user.role)) {
        router.push('/dashboard?error=unauthorized');
        return;
      }
      
      setCurrentUser(user);
      await loadDashboardData(user);
    } catch (error) {
      console.error("Error loading current user:", error);
      router.push('/login');
    }
  };

  const loadDashboardData = async (user: User) => {
    try {
      setLoading(true);
      
      // Load products, recent sales, and today's stats in parallel
      const [productsResponse, salesResponse, statsResponse] = await Promise.all([
        fetch(`/api/products?tenant_id=${user.tenant_id}`),
        fetch(`/api/sales?tenant_id=${user.tenant_id}&cashier_id=${user.id}&limit=10`),
        fetch(`/api/stats/today?tenant_id=${user.tenant_id}&cashier_id=${user.id}`)
      ]);

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        setRecentSales(salesData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTodayStats(statsData);
      }

      // Update last login
      await UserService.updateLastLogin(user.id);
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      alert("This product is out of stock");
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          alert("Maximum stock reached");
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, subtotal: product.price }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.stock_quantity) {
            alert("Maximum stock reached");
            return item;
          }
          return { ...item, quantity: newQuantity, subtotal: newQuantity * item.price };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setPaymentMethod("cash");
    setShowCheckout(false);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!currentUser) return;

    try {
      setProcessingSale(true);

      const saleData = {
        tenant_id: currentUser.tenant_id,
        cashier_id: currentUser.id,
        customer_name: customerName || undefined,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.subtotal
        })),
        total_amount: getTotalAmount()
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process sale');
      }

      const result = await response.json();
      
      // Clear cart and refresh data
      clearCart();
      await loadDashboardData(currentUser);
      
      alert(`Sale completed successfully! Receipt: ${result.receipt_number}`);
      
    } catch (error: any) {
      console.error("Error processing sale:", error);
      alert(`Failed to process sale: ${error.message}`);
    } finally {
      setProcessingSale(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Cashier Dashboard</h1>
                <div className="text-sm text-gray-500">
                  Welcome, {currentUser?.name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/dashboard/settings')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiSettings className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-73px)]">
          {/* Main Content */}
          <div className="flex-1 flex">
            {/* Products Section */}
            <div className="flex-1 p-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Today's Sales</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₦{todayStats.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <FiDollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {todayStats.totalTransactions}
                      </p>
                    </div>
                    <FiShoppingCart className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Cart Items</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                    <FiPackage className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-primary">₦{product.price.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        product.stock_quantity > 10
                          ? 'bg-green-100 text-green-700'
                          : product.stock_quantity > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stock_quantity} in stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Section */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FiShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Cart is empty</p>
                    <p className="text-sm">Add products to start selling</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <FiMinus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <FiPlus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-primary">₦{item.subtotal.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-gray-200 p-4">
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₦{getTotalAmount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">₦{getTotalAmount().toLocaleString()}</span>
                    </div>
                  </div>

                  {!showCheckout ? (
                    <button
                      onClick={() => setShowCheckout(true)}
                      className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Proceed to Checkout
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="transfer">Bank Transfer</option>
                          <option value="ussd">USSD</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowCheckout(false)}
                          className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={processSale}
                          disabled={processingSale}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingSale ? 'Processing...' : 'Complete Sale'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
