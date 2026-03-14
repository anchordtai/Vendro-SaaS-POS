# Foreign Key Constraint Fix - Sales Table

## 🚨 Critical Issue Identified

**Error:** `insert or update on table "sales" violates foreign key constraint "sales_cashier_id_fkey"`
**Details:** `Key is not present in table "users"`
**Root Cause:** Sales table references `users` table, but cashier is in `staff` table

## 🔍 Problem Analysis

### **Current Situation:**
- ✅ **Cashier exists** in `staff` table with user_id
- ✅ **Auth user exists** in Supabase Authentication
- ❌ **Sales table** references `users` table instead of `staff`
- ❌ **Foreign key constraint** blocks sales creation

### **Data Flow Issue:**
```
Auth User (cashier@onyxxnightlife.com.ng)
    ↓
Staff Record (user_id linked)
    ↓
Sales Table (cashier_id references users ❌)
```

## 🛠️ Complete Solution

### **Step 1: Run Foreign Key Fix**
1. **Go to:** Supabase Dashboard → SQL Editor
2. **Copy and paste:** `fix-sales-foreign-key.sql`
3. **Click "Run"**

### **What This Script Does:**

#### **Section 1: Analysis**
- Shows current sales table structure
- Identifies existing foreign key constraints
- Locates the problematic constraint

#### **Section 2: Fix Foreign Key**
- **Drops old constraint:** `sales_cashier_id_fkey`
- **Creates new constraint:** References `staff` table instead
- **Proper cascade:** `ON DELETE SET NULL`

#### **Section 3: Update RLS Policies**
- **Drops existing policies** that reference wrong table
- **Creates new policies** that work with staff table
- **Maintains security** while fixing functionality

#### **Section 4: Test & Verify**
- **Inserts test sale** with staff ID
- **Verifies constraint works**
- **Cleans up test data**
- **Final verification** of all sales

## 🎯 Expected Results

### **After Running SQL Script:**
- ✅ **No more foreign key violations**
- ✅ **Sales can reference staff table**
- ✅ **Cashier can create sales** successfully
- ✅ **All POS functionality works**
- ✅ **Proper data integrity** maintained

### **Data Flow After Fix:**
```
Auth User (cashier@onyxxnightlife.com.ng)
    ↓
Staff Record (user_id linked)
    ↓
Sales Table (cashier_id references staff ✅)
    ↓
Successful Sale Creation
```

## 📋 Testing Steps

### **After Running Fix:**
1. **Login as cashier:** `cashier@onyxxnightlife.com.ng`
2. **Add items to cart:** Select products
3. **Process checkout:** Click payment button
4. **Verify success:** No foreign key errors
5. **Check sales table:** New record should appear

### **Expected Console Output:**
- ✅ **No foreign key violations**
- ✅ **"Sale saved successfully"** message
- ✅ **Receipt printed** confirmation
- ✅ **Cart cleared** automatically

## 🔧 Alternative Solutions

### **If Script Fails:**

#### **Option A: Manual Foreign Key Fix**
```sql
-- Drop old constraint
ALTER TABLE sales DROP CONSTRAINT sales_cashier_id_fkey;

-- Add new constraint
ALTER TABLE sales 
ADD CONSTRAINT sales_cashier_id_fkey 
    FOREIGN KEY (cashier_id) 
    REFERENCES staff(id) 
    ON DELETE SET NULL;
```

#### **Option B: Check Table Structure**
```sql
-- Verify sales table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales';
```

#### **Option C: Update Sales Schema**
```sql
-- If needed, update cashier_id column
ALTER TABLE sales 
ALTER COLUMN cashier_id TYPE UUID 
USING cashier_id::uuid;
```

## 🔍 Troubleshooting

### **Still Getting Foreign Key Errors?**
1. **Check constraint was dropped:**
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints 
   WHERE table_name = 'sales';
   ```

2. **Verify staff record exists:**
   ```sql
   SELECT id, name, email FROM staff 
   WHERE email = 'cashier@onyxxnightlife.com.ng';
   ```

3. **Check data types match:**
   ```sql
   SELECT 
       s.id::text as staff_id_type,
       sa.cashier_id::text as sales_cashier_id_type
   FROM staff s, sales sa 
   WHERE s.email = 'cashier@onyxxnightlife.com.ng'
   LIMIT 1;
   ```

### **If RLS Policies Still Block:**
1. **Verify policies exist:**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'sales';
   ```

2. **Check user permissions:**
   ```sql
   SELECT auth.jwt() ->> 'role' as user_role;
   ```

3. **Test with super admin:** Try with admin account

## 📁 Files Created

- ✅ `fix-sales-foreign-key.sql` - Complete foreign key fix
- ✅ `FOREIGN_KEY_FIX_GUIDE.md` - This comprehensive guide

## 🚀 Next Steps

1. ✅ **Run foreign key fix** SQL script
2. ✅ **Test cashier checkout** functionality
3. ✅ **Verify all payment methods** work
4. ✅ **Test sales reporting** and history
5. ✅ **Ensure offline sync** works

## 🎉 Success Criteria

- [ ] No foreign key constraint violations
- [ ] Cashier can create sales successfully
- [ ] Sales data saves correctly
- [ ] Receipts print properly
- [ ] All POS functionality works
- [ ] Proper data integrity maintained

## 🔐 Security & Data Integrity

### **After Fix:**
- ✅ **Referential integrity** between sales and staff
- ✅ **Proper cascade** on delete
- ✅ **Role-based access** through RLS
- ✅ **Data consistency** maintained
- ✅ **Audit trail** preserved

Run the foreign key fix SQL script and the sales creation will work immediately! The sales table will properly reference the staff table instead of users.
