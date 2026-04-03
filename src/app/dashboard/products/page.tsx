"use client";

import { useState, useEffect } from "react";
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiPackage,
  FiGrid,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";
import { useAuthStore } from "@/lib/auth-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UserService, type User as TenantUser } from "@/lib/user-service";

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
  created_at: string;
  updated_at: string;
}

const categories = [
  "All",
  "Beer",
  "Whiskey",
  "Vodka",
  "Wine",
  "Cocktails",
  "Soft Drinks",
  "Food",
  "Spirits",
  "Non-Alcoholic",
];

export default function ProductsPage() {
  const { user, isAuthenticated, isOfflineMode } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<TenantUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load products with offline support
  useEffect(() => {
    (async () => {
      const u = await UserService.getCurrentUser();
      setCurrentUser(u);
      await loadProducts(u);
    })();
  }, []);

  const loadProducts = async (u?: TenantUser | null) => {
    try {
      setLoading(true);
      const effectiveUser = u ?? currentUser ?? (await UserService.getCurrentUser());
      if (!effectiveUser) throw new Error("Not authenticated");

      const res = await fetch(`/api/products?tenant_id=${effectiveUser.tenant_id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      alert("Failed to load products");
    } finally {
      setLoading(false);
    }
  };
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    barcode: "",
    stock_quantity: 0,
    category: "Beer",
    image: "🍺",
    image_url: null,
    status: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price,
        barcode: product.barcode,
        stock_quantity: product.stock_quantity,
        category: product.category,
        image: product.image || "🍺",
        image_url: product.image_url || null,
        status: product.status,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        price: 0,
        barcode: "",
        stock_quantity: 0,
        category: "Beer",
        image: "🍺",
        image_url: null,
        status: true,
      });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      let imageUrl = formData.image_url;
      
      // Upload image if file is selected
      if (imageFile) {
        setUploading(true);
        console.log('Starting upload for file:', imageFile.name);
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        console.log('Uploading to bucket: product-images, filename:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          });
          
        console.log('Upload result:', { uploadData, uploadError });
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          alert('Failed to upload image');
          return;
        }
        
        imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
      }

      const productData = {
        name: formData.name,
        price: formData.price,
        barcode: formData.barcode,
        stock_quantity: formData.stock_quantity,
        category: formData.category,
        image: formData.image,
        image_url: imageUrl,
        status: formData.status,
      };

      console.log("Product data being saved:", productData);

      if (editingProduct) {
        const res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: editingProduct.id,
            ...productData,
            updated_at: new Date().toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update product");
        setProducts(products.map((p) => (p.id === editingProduct.id ? data : p)));

        if (!isOfflineMode) {
          alert("Product updated successfully");
        } else {
          alert("Product changes will be synced when online");
        }
      } else {
        if (!currentUser) throw new Error("Not authenticated");
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...productData,
            tenant_id: currentUser.tenant_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add product");
        setProducts([...products, data]);

        if (!isOfflineMode) {
          alert("Product added successfully");
        } else {
          alert("Product will be synced when online");
        }
      }

      setShowModal(false);
      setImageFile(null);
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert(`Failed to save product: ${error.message}`);
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");
      await loadProducts(); // Reload products
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <ProtectedRoute allowedRoles={["tenant_admin", "manager", "super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500">Manage your product inventory</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isOfflineMode 
                ? 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/50' 
                : 'bg-green-500/20 text-green-700 border border-green-500/50'
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
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-primary rounded-xl hover:bg-primary/90"
            >
              <FiPlus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full py-2 pl-10 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Table */}
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
                    Price
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                    Barcode
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>Loading products...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                      <td className="px-6 py-4 text-gray-900">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            product.stock_quantity <= 10
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-500">
                        {product.barcode || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            product.status
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-2 text-gray-500 transition-colors rounded-lg hover:text-primary hover:bg-gray-100"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-gray-500 transition-colors rounded-lg hover:text-red-500 hover:bg-red-50"
                          >
                            <FiTrash2 className="w-4 h-4" />
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Price (₦)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Optional - for barcode scanning"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories
                      .filter((c) => c !== "All")
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Product Image
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          // Preview the image
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setFormData({ ...formData, image_url: e.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {formData.image_url && (
                      <div className="mt-2">
                        <img 
                          src={formData.image_url} 
                          alt="Product preview"
                          className="w-20 h-20 rounded object-cover border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Emoji Icon (fallback)
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="🍺"
                    maxLength={2}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="status"
                    checked={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Active (available for sale)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="flex-1 py-3 font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : (editingProduct ? "Save Changes" : "Add Product")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
