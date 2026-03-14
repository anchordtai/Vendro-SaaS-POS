-- FINAL Storage RLS Fix - Run this EXACTLY as written

-- Step 1: Remove ALL existing policies completely
DROP POLICY IF EXISTS "Allow authenticated users to upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to access product images" ON storage.objects;
DROP POLICY IF EXISTS "Enable all operations for product images" ON storage.objects;
DROP POLICY IF EXISTS "Public access to product images" ON storage.objects;

-- Step 2: Disable RLS temporarily to test
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Step 3: Test upload (this should work now)
-- If it works, then re-enable with simple policy:

-- Step 4: Re-enable RLS with minimal policy
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 5: Create the simplest possible policy
CREATE POLICY "Allow everything for product-images bucket"
ON storage.objects
FOR ALL
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Step 6: Verify the policy was created
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
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
