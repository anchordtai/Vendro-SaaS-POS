# Cashier Login Fix - Complete Guide

## Problem Identified
✅ **Auth user created:** `cashier@onyxxnightlife.com.ng` exists in Supabase Auth  
❌ **Login fails:** "User not found locally"  
❌ **Missing link:** Staff record not linked to auth user

## Root Cause
The auth store looks for user profiles in the `staff` table using `user_id`, but the staff record doesn't have the `user_id` from the auth user.

## 🔧 Quick Fix Solutions

### Option 1: Update Staff Record Directly (Recommended)

1. **Get the Auth User ID:**
   - Go to Supabase Dashboard → Authentication → Users
   - Find `cashier@onyxxnightlife.com.ng`
   - Copy the user ID (UUID)

2. **Update Staff Record:**
   ```sql
   UPDATE staff 
   SET user_id = 'PASTE_USER_ID_HERE' 
   WHERE email = 'cashier@onyxxnightlife.com.ng';
   ```

3. **Test Login:**
   - Go to login page
   - Use: `cashier@onyxxnightlife.com.ng` / `cashier@123`
   - Should work now!

### Option 2: Use the Link Function

If you have service role access, you can run this in your browser console:

```javascript
import { StaffService } from '@/lib/staff-service';

// Link the existing auth user to staff record
await StaffService.linkAuthUserToStaff('cashier@onyxxnightlife.com.ng');
```

### Option 3: Manual Link in Supabase Dashboard

1. **Find Auth User ID:**
   - Authentication → Users → Find your cashier
   - Copy the ID (starts with `auth_` or UUID)

2. **Update Staff Table:**
   - Table Editor → staff
   - Find the cashier record
   - Update `user_id` column with the auth user ID

## 🛠️ What I Fixed in the Code

### Updated Auth Store
```typescript
// Now checks both staff and users tables
const { data: staffProfile, error: staffError } = await supabase
  .from("staff")
  .select("*")
  .eq("user_id", data.user.id)
  .single();
```

### Added Link Function
```typescript
// New function to link existing auth users to staff
static async linkAuthUserToStaff(email: string): Promise<void>
```

## 📋 Step-by-Step Solution

### Step 1: Get Auth User ID
1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Find:** `cashier@onyxxnightlife.com.ng`
3. **Copy:** The UUID from the ID column

### Step 2: Update Staff Record
1. **Supabase Dashboard** → **Table Editor** → **staff**
2. **Find:** The cashier record
3. **Edit:** Set `user_id` to the copied UUID
4. **Save:** The record

### Step 3: Test Login
1. **Go to:** Login page
2. **Enter:** `cashier@onyxxnightlife.com.ng`
3. **Password:** `cashier@123`
4. **Should:** Login successfully to cashier dashboard

## 🎯 Expected Result

After linking the user:
- ✅ Cashier can login with credentials
- ✅ Redirected to cashier dashboard
- ✅ Can access POS system
- ✅ Can make sales
- ✅ Proper role permissions

## 🔍 Troubleshooting

### Still "User not found"?
1. **Check user_id is correctly set** in staff table
2. **Verify email matches exactly** (case-sensitive)
3. **Check staff status is 'active'**
4. **Clear browser cache** and try again

### Login works but wrong dashboard?
1. **Check role field** in staff table
2. **Should be 'cashier'** not 'super_admin'
3. **Verify routing logic** in your app

### Can't access POS?
1. **Check ProtectedRoute component**
2. **Verify cashier role permissions**
3. **Check navigation logic**

## 📁 Files Modified

- ✅ `src/lib/auth-store.ts` - Now checks staff table for cashiers
- ✅ `src/lib/staff-service.ts` - Added link function
- ✅ `CASHIER_LOGIN_FIX.md` - This guide

## 🚀 Next Steps

1. **Link the auth user** using Option 1 (easiest)
2. **Test cashier login** functionality
3. **Verify POS access** and sales capability
4. **Test role-based navigation**

## 🎉 Success Criteria

- [ ] Cashier can login with `cashier@onyxxnightlife.com.ng`
- [ ] Redirected to correct dashboard
- [ ] Can access POS system
- [ ] Can process sales
- [ ] Proper permissions applied

The main issue was that the staff record wasn't linked to the auth user. Once you update the `user_id` field in the staff table, the login will work perfectly!
