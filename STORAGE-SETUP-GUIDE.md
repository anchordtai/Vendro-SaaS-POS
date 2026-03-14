# Supabase Storage Setup Guide

## Your Bucket URL
```
https://kjefreqibschtfdwyyfu.storage.supabase.co/storage/v1/s3
```

## 🔧 Fix RLS Policy Error

### Step 1: Go to Supabase Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)

### Step 2: Run Storage Policies

Copy and paste this SQL code in the SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload product images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read product images
CREATE POLICY "Allow authenticated users to read product images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update product images
CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete product images
CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
```

### Step 3: Click "RUN"

Execute the SQL commands by clicking the **RUN** button.

## 🧪 Test Image Upload

After running the policies:

1. Go to Products page in your app
2. Click "Add Product"
3. Fill in product details
4. Choose an image file
5. Click "Add Product"

The upload should work without RLS errors.

## 🔍 Alternative: Manual Policy Setup

If SQL doesn't work, you can set policies manually:

1. Go to **Storage** → **Policies**
2. Click **"New Policy"** on `product-images` bucket
3. For each operation (INSERT, SELECT, UPDATE, DELETE):
   - **Policy Name**: `Allow product image [operation]`
   - **Allowed Operation**: Select the operation
   - **Target Roles**: `authenticated`
   - **Policy Definition**: `bucket_id = 'product-images'`

## ✅ Verification

After setup, you should see:
- No more RLS violation errors
- Images upload successfully
- Images display in both products page and POS

## 🚨 If Still Fails

Check:
1. Bucket name is exactly `product-images`
2. You're logged in as authenticated user
3. Policies are applied to correct bucket
4. No syntax errors in SQL
