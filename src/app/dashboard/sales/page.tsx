"use client";

import { useState, useEffect } from "react";
import {
  FiSearch,
  FiEye,
  FiPrinter,
  FiShoppingCart,
  FiDollarSign,
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Sale {
  id: string;
  receipt_number: string;
  cashier_id: string;
  cashier_name: string;
  total_amount: number;
  payment_method: 'cash' | 'pos_card' | 'bank_transfer';
  created_at: string;
  items?: SaleItem[];
}

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Load sales from Supabase
  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sales:', error);
        setSales([]);
      } else {
        setSales(data || []);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.cashier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.payment_method.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const loadSaleDetails = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (error) {
        console.error('Error loading sale items:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error loading sale items:', error);
      return [];
    }
  };

  const handleViewSale = async (sale: Sale) => {
    const items = await loadSaleDetails(sale.id);
    setSelectedSale({ ...sale, items });
  };

  const todayTotal = sales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "cashier"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="text-gray-500">View all transactions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Today's Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(todayTotal)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Average Order</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sales.length > 0 ? formatCurrency(todayTotal / sales.length) : formatCurrency(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sales..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Receipt #
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Cashier
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>Loading sales...</p>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <FiShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No sales found</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {sale.receipt_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(sale.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900">{sale.cashier_name}</td>
                      <td className="px-6 py-4 text-gray-900">
                        {sale.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            sale.payment_method === "cash"
                              ? "bg-green-100 text-green-700"
                              : sale.payment_method === "pos_card"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {sale.payment_method.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(sale.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewSale(sale)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors">
                            <FiPrinter className="w-4 h-4" />
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

        {/* View Receipt Modal */}
        {selectedSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm">
              <div className="p-6" id="receipt">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Onyxx Nightlife POS
                  </h2>
                  <p className="text-sm text-gray-500">123 Nightlife Avenue</p>
                </div>

                <div className="border-t border-b border-gray-200 py-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Receipt:</span>
                    <span className="font-semibold">
                      {selectedSale.receipt_number}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date:</span>
                    <span>{new Date(selectedSale.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cashier:</span>
                    <span>{selectedSale.cashier_name}</span>
                  </div>
                </div>

                {selectedSale.items && selectedSale.items.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Items</h3>
                    <div className="space-y-1">
                      {selectedSale.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Payment:{" "}
                    <span className="font-semibold capitalize">
                      {selectedSale.payment_method.replace("_", " ")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 border-t border-gray-100">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
                >
                  <FiPrinter className="w-5 h-5" />
                  Print
                </button>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
