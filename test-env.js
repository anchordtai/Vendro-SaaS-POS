// Test environment variables
console.log('Environment Variables Test:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***SET***' : 'NOT SET')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('\n❌ ISSUE: Environment variables are not loaded!')
  console.log('Please ensure your .env.local file contains:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://vlksqjwupktmvypfmfur.supabase.co')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_W1KzX92aK0WxgBuNyr7ECg_LcZnH6ke')
} else {
  console.log('\n✅ Environment variables are loaded correctly')
}
