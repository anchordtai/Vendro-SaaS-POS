# Sales Permission Fix - Cashier Can't Create Sales

## ✅ Problem Identified

**Cashier Login:** ✅ Working successfully  
**Cart & POS:** ✅ Working  
**❌ Sales Save:** 403 Forbidden - RLS Policy Violation

**Error Details:**
```
"code": "42501",
"message": "new row violates row-level security policy for table \"sales\""
```

## 🔍 Root Cause

The `sales` table has Row Level Security (RLS) policies that don't allow cashiers to insert sales records. Cashiers need permission to create sales transactions.

## 🛠️ Complete Solution

### Step 1: Run Sales Table Policies
1. **Go to:** Supabase Dashboard → SQL Editor
2. **Copy and paste:** `create-sales-table-policies.sql`
3. **Click "Run"**

### What This Script Does:
- ✅ **Enables RLS** on sales table
- ✅ **Creates policies** for cashiers
- ✅ **Allows cashiers** to create sales
- ✅ **Maintains security** with proper role checks
- ✅ **Verifies policies** work correctly

## 🎯 Expected Results

After running the SQL script:
- ✅ **Cashiers can create sales** (no more 403 errors)
- ✅ **POS checkout works** completely
- ✅ **Sales data saves** successfully
- ✅ **Receipts print** correctly
- ✅ **All transaction types** work (cash, card)

## 📋 Policy Details

### **Cashier Sales Policy:**
```sql
CREATE POLICY "Cashiers can create sales" ON sales
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.jwt() ->> 'role' IN ('cashier', 'super_admin')
    );
```

### **Security Features:**
- ✅ **Role-based access** - Only cashiers and super_admins
- ✅ **Authentication required** - Must be logged in
- ✅ **Own data access** - Users can view their own sales
- ✅ **Admin override** - Super admins can manage all sales

## 🔧 Alternative Solutions

### **If Script Fails:**

#### **Option A: Disable RLS Temporarily**
```sql
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
```
*Note: This reduces security - use only for testing*

#### **Option B: Manual Policy Creation**
```sql
-- Allow all authenticated users to create sales
CREATE POLICY "Allow authenticated sales" ON sales
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### **Option C: Update Existing Policies**
```sql
-- Modify existing policy to include cashiers
CREATE OR REPLACE POLICY "existing_policy_name" ON sales
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('cashier', 'super_admin'));
```

## 📱 Testing Steps

### **After Running SQL:**
1. **Login as cashier:** `cashier@onyxxnightlife.com.ng`
2. **Add items to cart:** Select products
3. **Process checkout:** Click payment button
4. **Verify success:** No 403 errors
5. **Check sales table:** New record should appear

### **Expected Console Output:**
- ✅ **No RLS violations**
- ✅ **"Sale saved successfully"** message
- ✅ **Receipt printed** confirmation
- ✅ **Cart cleared** automatically

## 🔍 Troubleshooting

### **Still Getting 403 Errors?**
1. **Check policies were created:**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'sales';
   ```

2. **Verify user role:**
   ```sql
   SELECT auth.jwt() ->> 'role' as user_role;
   ```

3. **Check authentication:**
   ```sql
   SELECT auth.role() as is_authenticated;
   ```

4. **Clear browser cache** and retry

## 📁 Files Created

- ✅ `create-sales-table-policies.sql` - Complete RLS policies
- ✅ `SALES_PERMISSION_FIX.md` - This comprehensive guide

## 🎉 Success Criteria

- [ ] Cashier can create sales without 403 errors
- [ ] POS checkout works completely
- [ ] Sales data saves successfully
- [ ] Receipts print correctly
- [ ] Cart management works
- [ ] All payment methods functional

## 🚀 Next Steps

1. ✅ **Run sales policies SQL** script
2. ✅ **Test cashier checkout** functionality
3. ✅ **Verify all payment methods** (cash, card)
4. ✅ **Test sales reporting** and history
5. ✅ **Ensure offline sync** works

## 🔐 Security Notes

The new policies maintain security while enabling functionality:
- ✅ **Authentication required** for all sales operations
- ✅ **Role-based access** (cashiers, super_admins)
- ✅ **Own data protection** (users can only see their sales)
- ✅ **Admin override** (super_admins have full access)

Run the SQL script and cashiers will be able to create sales successfully!
