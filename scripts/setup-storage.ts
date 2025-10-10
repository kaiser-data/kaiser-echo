/**
 * Setup Supabase Storage bucket for avatar images
 * Run with: npx ts-node scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required')
    console.error('Please set them in your environment or .env file')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('❌ Error listing buckets:', listError)
    return
  }

  const avatarsBucket = buckets?.find((b) => b.name === 'avatars')

  if (avatarsBucket) {
    console.log('✅ Bucket "avatars" already exists')
    return
  }

  // Create bucket
  console.log('📦 Creating "avatars" bucket...')
  const { data: bucket, error: createError } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  })

  if (createError) {
    console.error('❌ Error creating bucket:', createError)
    return
  }

  console.log('✅ Bucket created successfully:', bucket)
}

setupStorage().catch(console.error)
