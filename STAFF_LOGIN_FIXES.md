# Staff Login Issues & Solutions

## Current Status

✅ **Staff Creation:** Working successfully  
❌ **User Login:** Failing due to account creation issues

## Issues Identified

### 1. Email Validation Error
**Error:** `Email address "cashier20@onyxxnightlife.com.ng" is invalid`
**Cause:** Supabase doesn't accept `.ng` domain extensions
**Solution:** Use standard email domains (.com, .org, .net)

### 2. User Account Not Created
**Error:** 400/403 errors during signup
**Cause:** Authentication permissions and email validation
**Solution:** Manual user creation and proper email formatting

## 🔧 Fixes Applied

### 1. Email Normalization
```typescript
// Before
email: staffData.email

// After  
email: staffData.email.trim().toLowerCase()
```

### 2. Added Manual User Creation
```typescript
// New function for creating user accounts for existing staff
static async createUserForStaff(staffId: string, email: string, password: string)
```

## 📋 Solutions

### Option 1: Use Valid Email Domain
When creating staff, use emails like:
- ✅ `cashier1@onyxxnightlife.com`
- ✅ `cashier2@onyxxnightlife.org`  
- ✅ `manager@onyxxnightlife.net`
- ❌ `cashier@onyxxnightlife.com.ng` (invalid)

### Option 2: Manual User Creation
If staff already exists but can't login:

1. **Use the new function:**
```javascript
import { StaffService } from '@/lib/staff-service';

// Create user account for existing staff
await StaffService.createUserForStaff(
  'staff-id-here', 
  'valid-email@domain.com', 
  'password123'
);
```

### Option 3: Supabase Dashboard
Create user accounts directly:

1. **Go to Supabase Dashboard** → Authentication → Users
2. **Click "Add User"**
3. **Enter email and password**
4. **Set user metadata:**
   ```json
   {
     "name": "Staff Name",
     "role": "cashier",
     "staff_id": "staff-uuid"
   }
   ```
5. **Update staff record** with the user_id

## 🚀 Testing Steps

### Step 1: Create New Staff with Valid Email
1. Go to Staff Management page
2. Use email: `test@onyxxnightlife.com`
3. Set password: `password123`
4. Create staff member
5. Try login with new credentials

### Step 2: Fix Existing Staff
1. Find staff member who can't login
2. Use `createUserForStaff` function
3. Or create user manually in Supabase Dashboard
4. Test login

### Step 3: Verify User Link
1. Check staff record has `user_id`
2. Verify user exists in Auth → Users
3. Test login functionality

## 🔍 Troubleshooting

### Still Getting Email Errors?
- Use standard email domains (.com, .org, .net)
- Ensure email format is correct
- Check for special characters

### User Created But Can't Login?
1. **Check if email was confirmed:**
   - Go to Supabase Dashboard → Authentication → Users
   - Look for "Email Confirmed" status
   - Manually confirm if needed

2. **Check password strength:**
   - Use passwords with 6+ characters
   - Include numbers and letters

3. **Verify user metadata:**
   - User should have `role` and `staff_id` in metadata
   - Staff record should have matching `user_id`

### 403 Login Errors?
- Check user authentication status
- Verify RLS policies allow access
- Ensure user is properly linked to staff record

## 📱 User Experience

### Successful Creation Flow:
1. ✅ Staff record created
2. ✅ User account created  
3. ✅ User can login immediately
4. ✅ Proper role assignment

### Fallback Flow:
1. ✅ Staff record created
2. ⚠️ User creation fails
3. ✅ Admin notified of partial success
4. ✅ Manual user creation available

## 🛠️ Advanced Solutions

### Service Role Key Setup
If you want admin user creation to work:

1. **Get Service Role Key:**
   - Supabase Dashboard → Settings → API
   - Copy `service_role` key

2. **Update Environment:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Update Client:**
   ```typescript
   const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
     auth: { autoRefreshToken: false, persistSession: false }
   });
   ```

### Email Verification Setup
1. **Configure SMTP settings** in Supabase Dashboard
2. **Enable email confirmation**
3. **Set up custom email templates**

## 📋 Next Steps

1. ✅ **Test with valid email domains**
2. ✅ **Use manual user creation for existing staff**
3. ✅ **Verify login functionality**
4. ✅ **Check user-staff linking**

## 🎯 Success Criteria

- ✅ Staff can be created with valid emails
- ✅ User accounts are properly created
- ✅ Login works for new staff members
- ✅ Existing staff can be given login access
- ✅ Proper error handling and user feedback

The login issues are primarily due to email domain validation and authentication permissions. Use valid email domains and the manual user creation function for existing staff members.
