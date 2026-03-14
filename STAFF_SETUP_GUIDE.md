# Staff Management Setup Guide

## Issues Fixed

### ✅ 1. Staff Table Missing (404 Error)
**Problem:** The `staff` table doesn't exist in Supabase
**Solution:** Run the SQL script in Supabase SQL Editor

### ✅ 2. Authentication Permissions (403 Error)
**Problem:** Current user doesn't have admin permissions to create auth users
**Solution:** Updated staff service with fallback methods

## Setup Instructions

### Step 1: Create Staff Table in Supabase

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the entire contents of `create-staff-table.sql`**
4. **Click "Run"**

The SQL script will:
- ✅ Create the `staff` table with proper columns
- ✅ Set up indexes for performance
- ✅ Enable Row Level Security (RLS)
- ✅ Create security policies for staff management
- ✅ Grant necessary permissions

### Step 2: Verify Table Creation

After running the SQL, you should see:
- Table structure confirmation
- Index creation confirmation
- Policy creation confirmation

### Step 3: Test Staff Management

1. **Go to the Staff Management page**
2. **Try adding a new staff member**
3. **The system will now:**
   - ✅ Try admin user creation first (if you have service role key)
   - ✅ Fall back to staff record creation + regular signup
   - ✅ Handle errors gracefully
   - ✅ Provide user feedback

## How the Fix Works

### Authentication Fallback Strategy

```typescript
// Method 1: Admin User Creation (requires service role key)
const { data, error } = await supabase.auth.admin.createUser({...});

// Method 2: Fallback - Staff Record First
const { data: staffRecord } = await supabase.from('staff').insert({...});

// Then create user with regular signup
await supabase.auth.signUp({...});
```

### Error Handling

- **404 Errors:** Fixed by creating the staff table
- **403 Errors:** Fixed with fallback authentication methods
- **Permission Issues:** Handled gracefully with user feedback

## What Happens When Adding Staff

### Success Scenario (Admin Rights)
1. Creates auth user with admin API
2. Creates staff record linked to user
3. User can immediately login

### Fallback Scenario (Limited Rights)
1. Creates staff record first
2. Attempts user signup
3. If signup fails, staff record still exists
4. User can set password later or admin can reset

### User Feedback

- ✅ **Success:** "Staff member created successfully"
- ⚠️ **Partial Success:** "Staff record created, but user signup failed. User may need to set password later."
- ❌ **Error:** Clear error messages with specific issues

## Troubleshooting

### Still Getting 404 Errors?
- Verify the SQL script ran successfully
- Check the `staff` table exists in Supabase
- Refresh the page and try again

### Still Getting 403 Errors?
- Check your Supabase authentication settings
- Verify your user has admin rights
- Try the fallback method (should work automatically)

### Staff Member Can't Login?
- Check if user account was created
- Try password reset functionality
- Verify email confirmation (if enabled)

## Security Considerations

### Row Level Security (RLS)
- ✅ Only super admins can manage staff
- ✅ Staff can view their own profile
- ✅ Proper access controls in place

### User Management
- ✅ Auth users linked to staff records
- ✅ Proper cleanup on deletion
- ✅ Secure password handling

## Next Steps

1. ✅ **Run the SQL script** in Supabase
2. ✅ **Test staff creation** functionality
3. ✅ **Verify user login** works
4. ✅ **Test all staff operations** (edit, delete, status toggle)

## Files Modified

- ✅ `src/lib/staff-service.ts` - Fixed authentication issues
- ✅ `create-staff-table.sql` - Ready to run
- ✅ `STAFF_SETUP_GUIDE.md` - This guide

## Support

If you still encounter issues:
1. Check Supabase logs for detailed error messages
2. Verify your authentication configuration
3. Ensure the SQL script ran completely
4. Test with different user roles if available

The staff management system is now designed to work with various permission levels and will gracefully handle authentication limitations.
