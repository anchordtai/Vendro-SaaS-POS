"use client";

import { useState, useEffect } from "react";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiPackage,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
  stock_quantity: number;
  category: string;
  image: string;
  image_url?: string | null;
  status: boolean;
  updated_at: string;
}

const LOW_STOCK_THRESHOLD = 10;

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);

  // Load products from Supabase
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading products:", error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter(
    (p) => p.stock_quantity <= LOW_STOCK_THRESHOLD
  );

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentAmount(0);
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct) return;

    try {
      const newStock = selectedProduct.stock_quantity + adjustmentAmount;

      if (newStock < 0) {
        alert("Stock cannot be negative");
        return;
      }

      const { error } = await supabase
        .from("products")
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedProduct.id);

      if (error) {
        console.error("Error adjusting stock:", error);
        alert("Failed to adjust stock");
        return;
      }

      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustmentAmount(0);
      await loadProducts(); // Reload products
    } catch (error) {
      console.error("Error adjusting stock:", error);
      alert("Failed to adjust stock");
    }
  };

  const saveAdjustment = () => {
    if (!selectedProduct) return;

    const newQuantity = Math.max(
      0,
      selectedProduct.stock_quantity + adjustmentAmount
    );

    setProducts(
      products.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              stock_quantity: newQuantity,
              updated_at: new Date().toISOString().split("T")[0],
            }
          : p,
      ),
    );
    setShowAdjustModal(false);
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500">Track and manage stock levels</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-700">Low Stock Alert</h3>
                <p className="text-sm text-red-600">
                  {lowStockProducts.length} product(s) running low on stock
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.length}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                <FiPackage className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {lowStockProducts.length}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-500">Total Stock Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    products.reduce((sum, p) => sum + p.price * p.stock_quantity, 0)
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
                <FiPackage className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

      {/* Search */}
      <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="relative">
          <FiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory..."
            className="w-full py-2 pl-10 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                  Product
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                  Category
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                  Stock
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                  Status
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                  Last Updated
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading inventory...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <FiPackage className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-8 h-8 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-2xl ${product.image_url ? 'hidden' : ''}`}>
                          {product.image || "📦"}
                        </span>
                        <span className="font-medium text-gray-900">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {product.stock_quantity <= 5 ? (
                        <span className="flex items-center gap-1 text-sm text-red-600">
                          <FiAlertTriangle className="w-4 h-4" />
                          Critical
                        </span>
                      ) : product.stock_quantity <= LOW_STOCK_THRESHOLD ? (
                        <span className="flex items-center gap-1 text-sm text-orange-600">
                          <FiAlertTriangle className="w-4 h-4" />
                          Low
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">In Stock</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAdjustStock(product)}
                          className="p-2 text-gray-500 transition-colors rounded-lg hover:text-primary hover:bg-gray-100"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Adjust Stock
            </h2>

            <div className="p-4 mb-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                {selectedProduct.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="w-8 h-8 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`text-2xl ${selectedProduct.image_url ? 'hidden' : ''}`}>
                  {selectedProduct.image || "📦"}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedProduct.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Current Stock: {selectedProduct.stock_quantity}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Adjustment Amount
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setAdjustmentAmount(adjustmentAmount - 1)}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <FiArrowDown className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) =>
                    setAdjustmentAmount(parseInt(e.target.value) || 0)
                  }
                  className="flex-1 px-4 py-2 text-lg font-semibold text-center border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setAdjustmentAmount(adjustmentAmount + 1)}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <FiArrowUp className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                New Stock: <span className="font-semibold">
                  {Math.max(0, selectedProduct.stock_quantity + adjustmentAmount)}
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="flex-1 py-3 font-semibold text-white bg-primary rounded-xl hover:bg-primary/90"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
        
