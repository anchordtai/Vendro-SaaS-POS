-- Quick test to verify receipt tables exist and are working
-- Run this in Supabase SQL editor

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('print_settings', 'receipts')
ORDER BY table_name;

-- Check if tables have data
SELECT 'print_settings' as table_name, COUNT(*) as record_count FROM print_settings
UNION ALL
SELECT 'receipts' as table_name, COUNT(*) as record_count FROM receipts;

-- Show print_settings table structure
SELECT 
    'print_settings' as table_info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'print_settings'
ORDER BY ordinal_position;

-- Show receipts table structure
SELECT 
    'receipts' as table_info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'receipts'
ORDER BY ordinal_position;
