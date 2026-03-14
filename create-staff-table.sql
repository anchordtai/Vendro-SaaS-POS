-- Create staff table for managing cashier accounts
-- Run this in your Supabase SQL editor

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'cashier')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (ignore if they already exist)
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

-- Enable RLS on staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view all staff" ON staff;
DROP POLICY IF EXISTS "Super admins can insert staff" ON staff;
DROP POLICY IF EXISTS "Super admins can update staff" ON staff;
DROP POLICY IF EXISTS "Super admins can delete staff" ON staff;
DROP POLICY IF EXISTS "Staff can view their own profile" ON staff;

-- Create RLS policies
CREATE POLICY "Enable all authenticated users to manage staff" ON staff
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Super admins can view all staff" ON staff
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'super_admin'
        OR user_id = auth.uid()
    );

CREATE POLICY "Super admins can insert staff" ON staff
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Super admins can update staff" ON staff
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'super_admin'
        OR user_id = auth.uid()
    );

CREATE POLICY "Super admins can delete staff" ON staff
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Staff can view their own profile" ON staff
    FOR SELECT USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON staff TO authenticated;

-- Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'staff' 
ORDER BY ordinal_position;
