'use client'

import { useState, useEffect } from 'react'
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiCalendar,
  FiDownload,
  FiDollarSign,
  FiShoppingCart,
  FiPackage
} from 'react-icons/fi'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/currency'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Sale {
  id: string
  total_amount: number
  payment_method: string
  created_at: string
  items?: SaleItem[]
}

interface SaleItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

interface Product {
  id: string
  name: string
  price: number
  category: string
  stock_quantity: number
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly'

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('daily')
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Load data from Supabase
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')

      if (salesError) console.error('Error loading sales:', salesError)
      if (productsError) console.error('Error loading products:', productsError)

      setSales(salesData || [])
      setProducts(productsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Process data for charts
  const getChartData = () => {
    const now = new Date()
    const data = []

    if (period === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' })
        
        const daySales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at)
          return saleDate.toDateString() === date.toDateString()
        })
        
        data.push({
          name: dateStr,
          sales: daySales.reduce((sum, s) => sum + s.total_amount, 0),
          orders: daySales.length
        })
      }
    } else if (period === 'weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - (i * 7))
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        
        const weekSales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at)
          return saleDate >= weekStart && saleDate <= weekEnd
        })
        
        data.push({
          name: `Week ${4 - i}`,
          sales: weekSales.reduce((sum, s) => sum + s.total_amount, 0),
          orders: weekSales.length
        })
      }
    } else {
      // Last 4 months
      for (let i = 3; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        
        const monthSales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at)
          return saleDate >= monthStart && saleDate <= monthEnd
        })
        
        data.push({
          name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          sales: monthSales.reduce((sum, s) => sum + s.total_amount, 0),
          orders: monthSales.length
        })
      }
    }

    return data
  }

  const getTotalSales = () => {
    return getChartData().reduce((sum, d) => sum + d.sales, 0)
  }

  const getTopProducts = () => {
    // Calculate product sales from sales items
    const productSales: { [key: string]: { name: string; sales: number; revenue: number } } = {}
    
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              name: item.product_name,
              sales: 0,
              revenue: 0
            }
          }
          productSales[item.product_id].sales += item.quantity
          productSales[item.product_id].revenue += item.subtotal
        })
      }
    })

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }

  const getCategoryData = () => {
    const categorySales: { [key: string]: number } = {}
    
    products.forEach(product => {
      if (!categorySales[product.category]) {
        categorySales[product.category] = 0
      }
      categorySales[product.category] += product.stock_quantity * product.price
    })

    const colors = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706']
    
    return Object.entries(categorySales)
      .map(([name, value], index) => ({
        name,
        value: Math.round((value / Object.values(categorySales).reduce((a, b) => a + b, 0)) * 100),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Product', 'Quantity', 'Price', 'Total'].join(','),
      ...sales.flatMap(sale => 
        sale.items?.map(item => [
          new Date(sale.created_at).toLocaleDateString(),
          item.product_name,
          item.quantity.toString(),
          item.price.toString(),
          item.subtotal.toString()
        ].join(',') ) || []
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-report-${period}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <ProtectedRoute allowedRoles={["super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500">Analyze sales performance</p>
          </div>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(getChartData().reduce((sum, d) => sum + d.sales, 0))}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <FiDollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Average Order</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getChartData().length > 0 
                        ? formatCurrency(getChartData().reduce((sum, d) => sum + d.sales, 0) / getChartData().length)
                        : '₦0'
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FiShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Products</p>
                    <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FiPackage className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Period Selector */}
            <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod('daily')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    period === 'daily' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiCalendar className="w-5 h-5" />
                  Daily
                </button>
                <button
                  onClick={() => setPeriod('weekly')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    period === 'weekly' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiCalendar className="w-5 h-5" />
                  Weekly
                </button>
                <button
                  onClick={() => setPeriod('monthly')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    period === 'monthly' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiCalendar className="w-5 h-5" />
                  Monthly
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm text-gray-500">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₦{getTotalSales().toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <FiTrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">+12.5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
                    <FiDollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">393</p>
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <FiTrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">+8.2%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                    <FiShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm text-gray-500">Avg. Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">₦228.50</p>
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <FiTrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">-2.1%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
                    <FiPackage className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Revenue Chart */}
              <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'} Revenue
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Sales']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Bar dataKey="sales" fill="#2563EB" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">Sales by Category</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Sales']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {getCategoryData().map((category) => (
                    <div key={category.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-gray-600">{category.name}</span>
                      </div>
                      <span className="font-medium text-gray-900">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-primary rounded-xl hover:bg-primary/90"
                >
                  <FiDownload className="w-5 h-5" />
                  Export CSV
                </button>
              </div>
              <div className="space-y-2">
                {getTopProducts().map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-20 text-sm text-right text-gray-500">{product.sales} sold</span>
                      <span className="w-24 text-sm font-medium text-right text-gray-900">
                        ₦{product.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
