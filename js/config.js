// Secure Supabase configuration for browser environment
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';

// Validation check
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    throw new Error('Please check your environment configuration');
}

// Create and export Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Database tables (matching your existing structure)
export const TABLES = {
    USERS: 'test_users',
    DISTRICTS: 'districts',
    SCHEMES: 'schemes',
    INPUT_TYPES: 'input_types',
    TRADE_NAMES: 'trade_names',
    UNITS: 'units',
    REPORTS: 'viksit_krishi_report',
    NAVIGATION: 'navigation_items',
    NAV_CATEGORIES: 'navigation_categories'
};

// Test connection
console.log('🔗 Supabase connection initialized');
console.log('📍 URL:', supabaseUrl);

// Test database connection
supabaseClient.from('districts').select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
        } else {
            console.log('✅ Supabase connected successfully');
            console.log(`📊 Found ${count} districts in database`);
        }
    })
    .catch(err => {
        console.error('❌ Connection test failed:', err);
    });

// Export for use in other files
export { supabaseClient, supabaseUrl, supabaseKey };
