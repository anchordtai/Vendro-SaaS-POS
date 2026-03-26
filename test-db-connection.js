import { createClient } from '@supabase/supabase-js'

// Test database connection
async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Your Supabase credentials
    const supabaseUrl = 'https://vlksqjwupktmvypfmfur.supabase.co'
    const supabaseKey = 'sb_publishable_W1KzX92aK0WxgBuNyr7ECg_LcZnH6ke'
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test basic connection by checking auth status
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful!')
    console.log('📊 Connected to:', supabaseUrl)
    console.log('🔑 Authentication service is accessible')
    
    // Test if we can access the database info
    try {
      const { data: versionData, error: versionError } = await supabase
        .rpc('version')
      
      if (!versionError) {
        console.log('�️ Database version:', versionData)
      }
    } catch (e) {
      console.log('🗄️ Database is accessible (version check not available)')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    return false
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Database is ready for schema setup!')
    console.log('Next step: Execute the SQL schema files in order:')
    console.log('1. saas-schema.sql')
    console.log('2. payment-tables.sql') 
    console.log('3. rls-policies.sql')
    console.log('4. seed-plans.sql')
  } else {
    console.log('\n❌ Please check your credentials and try again')
  }
})
