#!/usr/bin/env node

/**
 * ClaimWise Authentication Setup Script
 * 
 * This script helps set up the email authentication flow by:
 * 1. Checking Supabase configuration
 * 2. Providing SQL to run in Supabase dashboard
 * 3. Testing the authentication flow
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 ClaimWise Email Authentication Setup');
console.log('=' * 50);

// Check if .env.local exists
const envPath = path.join(__dirname, '..', 'frontend', '.env.local');
if (!fs.existsSync(envPath)) {
    console.log('❌ Missing .env.local file in frontend directory');
    console.log('Please create it with:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
    process.exit(1);
}

console.log('✅ Environment file found');

// Read and display the SQL schema
const schemaPath = path.join(__dirname, 'src', 'supabase_schema.sql');
if (fs.existsSync(schemaPath)) {
    console.log('\n📋 STEP 1: Run this SQL in your Supabase Dashboard');
    console.log('-'.repeat(50));
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Open your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the following SQL:');
    console.log('-'.repeat(50));
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(schema);
    
    console.log('-'.repeat(50));
    console.log('5. Click "Run" to execute the SQL');
}

console.log('\n🧪 STEP 2: Test the Authentication Flow');
console.log('-'.repeat(50));
console.log('1. Make sure your frontend is running: npm run dev');
console.log('2. Go to http://localhost:3000/signup');
console.log('3. Try creating an account with email/password');
console.log('4. Check the browser console for detailed logs');

console.log('\n🔍 STEP 3: Monitor the Process');
console.log('-'.repeat(50));
console.log('Watch for these log messages in browser console:');
console.log('• 🔍 Phase 1: Starting form validation');
console.log('• 🚀 Phase 2: Starting 3-strategy authentication');
console.log('• ✅ Strategy 1 successful - proceeding with user sync');
console.log('• 🎉 Phase 5: Signup successful');

console.log('\n🛠️ TROUBLESHOOTING');
console.log('-'.repeat(50));
console.log('If you see "📧 Email signup temporarily unavailable":');
console.log('1. Check that the SQL was run successfully in Supabase');
console.log('2. Verify RLS policies are enabled on users table');
console.log('3. Try using Google or GitHub signup as alternative');

console.log('\n✨ Setup complete! Try the email signup flow now.');
