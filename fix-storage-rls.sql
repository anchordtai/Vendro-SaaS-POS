-- Complete Storage RLS Fix - Run this in Supabase SQL Editor

-- Step 1: Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow authenticated users to upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to access product images" ON storage.objects;

-- Step 2: Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a single comprehensive policy that allows everything
CREATE POLICY "Enable all operations for product images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'product-images'
)
WITH CHECK (
  bucket_id = 'product-images'
);

-- Step 4: Alternative - If above doesn't work, try this more permissive version
-- Uncomment and run if the first policy doesn't work

/*
DROP POLICY IF EXISTS "Enable all operations for product images" ON storage.objects;

CREATE POLICY "Enable all operations for product images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'product-images' AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'product-images' AND auth.role() = 'authenticated'
);
*/

-- Step 5: Check if policies were created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
