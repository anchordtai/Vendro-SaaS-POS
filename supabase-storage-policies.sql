-- Supabase Storage Policies for product-images bucket
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Create policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 2. Create policy to allow authenticated users to update images
CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 3. Create policy to allow authenticated users to read images
CREATE POLICY "Allow authenticated users to read product images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Create policy to allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Grant access to super_admin role specifically (optional)
CREATE POLICY "Allow super_admin full access to product images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'product-images' 
  AND (
    auth.role() = 'authenticated' 
    AND (
      -- Check if user has super_admin role in user_profiles
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'super_admin'
      )
      OR auth.jwt()->>'role' = 'super_admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'product-images' 
  AND (
    auth.role() = 'authenticated' 
    AND (
      -- Check if user has super_admin role in user_profiles
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'super_admin'
      )
      OR auth.jwt()->>'role' = 'super_admin'
    )
  )
);
