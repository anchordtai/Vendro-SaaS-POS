-- Simple Storage Policies for product-images bucket
-- Use these if you want all authenticated users to access images

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to access product images
CREATE POLICY "Allow all authenticated users to access product images"
ON storage.objects
FOR ALL
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Alternative: Allow public access (no authentication required)
-- Uncomment the following lines if you want images to be publicly accessible

-- CREATE POLICY "Allow public access to product images"
-- ON storage.objects
-- FOR SELECT
-- USING (bucket_id = 'product-images');
