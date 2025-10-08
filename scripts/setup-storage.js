/**
 * Setup Supabase Storage bucket for avatar images
 * Run with: node scripts/setup-storage.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pawwjarivbhavmetdhgb.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '***REMOVED***'

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...')

  // Check if bucket exists
  const listResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })

  const buckets = await listResponse.json()
  console.log('📦 Existing buckets:', buckets)

  const avatarsBucket = buckets.find((b) => b.name === 'avatars')

  if (avatarsBucket) {
    console.log('✅ Bucket "avatars" already exists')
    return
  }

  // Create bucket
  console.log('📦 Creating "avatars" bucket...')
  const createResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'avatars',
      public: true,
      file_size_limit: 52428800, // 50MB
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    })
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    console.error('❌ Error creating bucket:', error)
    return
  }

  const bucket = await createResponse.json()
  console.log('✅ Bucket created successfully:', bucket)
}

setupStorage().catch(console.error)
