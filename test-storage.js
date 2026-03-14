// Test this in browser console on your app
// Copy and paste this code to test storage access

async function testStorage() {
  console.log('Testing storage access...');
  
  // Test 1: List buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  console.log('Buckets:', { buckets, bucketsError });
  
  // Test 2: Try to upload a simple text file
  const testFile = new Blob(['test content'], { type: 'text/plain' });
  const fileName = `test-${Date.now()}.txt`;
  
  console.log('Attempting upload of:', fileName);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, testFile);
    
  console.log('Upload result:', { uploadData, uploadError });
  
  // Test 3: Try to get public URL
  if (uploadData) {
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
      
    console.log('Public URL:', publicUrl);
  }
  
  // Test 4: Check current user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user);
}

// Run the test
testStorage();
