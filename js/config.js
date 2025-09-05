// OLD CODE (Remove this):
// const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// NEW SECURE CODE:
// Get credentials from environment variables
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Security check
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing!');
    console.error('Make sure .env file exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    throw new Error('Missing Supabase credentials');
}

// Create Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Connection test
console.log('🔗 Supabase connection initialized');
console.log('📍 URL:', supabaseUrl);

// Export for other files
export { supabaseClient, supabaseUrl, supabaseKey };
