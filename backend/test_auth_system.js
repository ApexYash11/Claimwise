#!/usr/bin/env node

/**
 * Test Email Authentication Flow
 * 
 * This script tests the various components of the email auth system
 */

console.log('🧪 Testing ClaimWise Email Authentication Components');
console.log('=' * 60);

// Test 1: Check Environment Variables
console.log('\n📋 Test 1: Environment Configuration');
console.log('-'.repeat(40));

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'frontend', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    console.log(`✅ .env.local file exists`);
    console.log(`${hasSupabaseUrl ? '✅' : '❌'} SUPABASE_URL configured`);
    console.log(`${hasSupabaseKey ? '✅' : '❌'} SUPABASE_ANON_KEY configured`);
} else {
    console.log('❌ .env.local file missing');
}

// Test 2: Check File Structure
console.log('\n📁 Test 2: File Structure');
console.log('-'.repeat(40));

const filesToCheck = [
    '../frontend/lib/auth.ts',
    '../frontend/components/auth/signup-form.tsx',
    '../frontend/lib/supabase.ts',
    './src/supabase_schema.sql'
];

filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Test 3: Check Auth.ts Implementation
console.log('\n🔧 Test 3: Authentication Implementation');
console.log('-'.repeat(40));

const authPath = path.join(__dirname, '..', 'frontend', 'lib', 'auth.ts');
if (fs.existsSync(authPath)) {
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    const hasThreeStrategy = authContent.includes('Strategy 1') && 
                           authContent.includes('Strategy 2') && 
                           authContent.includes('Strategy 3');
    const hasSyncUser = authContent.includes('syncUserToDatabase');
    const hasErrorHandling = authContent.includes('ConfigurationError');
    const hasLogging = authContent.includes('console.log');
    
    console.log(`${hasThreeStrategy ? '✅' : '❌'} 3-Strategy signup approach`);
    console.log(`${hasSyncUser ? '✅' : '❌'} User sync to database`);
    console.log(`${hasErrorHandling ? '✅' : '❌'} Error handling for config issues`);
    console.log(`${hasLogging ? '✅' : '❌'} Detailed logging for debugging`);
}

// Test 4: Check Signup Form Implementation
console.log('\n📝 Test 4: Signup Form Implementation');
console.log('-'.repeat(40));

const formPath = path.join(__dirname, '..', 'frontend', 'components', 'auth', 'signup-form.tsx');
if (fs.existsSync(formPath)) {
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    const hasFormValidation = formContent.includes('Phase 1: Starting form validation');
    const hasErrorMessages = formContent.includes('Email signup is temporarily unavailable');
    const hasSocialFallback = formContent.includes('Google or GitHub signup');
    const hasSuccessHandling = formContent.includes('Phase 5: Success flow');
    
    console.log(`${hasFormValidation ? '✅' : '❌'} Form validation with logging`);
    console.log(`${hasErrorMessages ? '✅' : '❌'} User-friendly error messages`);
    console.log(`${hasSocialFallback ? '✅' : '❌'} Social login fallback guidance`);
    console.log(`${hasSuccessHandling ? '✅' : '❌'} Success flow handling`);
}

// Test 5: Check Database Schema
console.log('\n🗄️ Test 5: Database Schema');
console.log('-'.repeat(40));

const schemaPath = path.join(__dirname, 'src', 'supabase_schema.sql');
if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    const hasRLS = schemaContent.includes('ROW LEVEL SECURITY');
    const hasTrigger = schemaContent.includes('CREATE TRIGGER');
    const hasErrorHandling = schemaContent.includes('EXCEPTION');
    const hasPermissions = schemaContent.includes('GRANT');
    
    console.log(`${hasRLS ? '✅' : '❌'} Row Level Security policies`);
    console.log(`${hasTrigger ? '✅' : '❌'} Automatic user creation trigger`);
    console.log(`${hasErrorHandling ? '✅' : '❌'} Error handling in trigger`);
    console.log(`${hasPermissions ? '✅' : '❌'} Proper permissions granted`);
}

console.log('\n🎯 Next Steps:');
console.log('-'.repeat(40));
console.log('1. If any tests failed ❌, review and fix those components');
console.log('2. Run the SQL schema in your Supabase dashboard');
console.log('3. Start your frontend: cd frontend && npm run dev');
console.log('4. Test signup at: http://localhost:3000/signup');
console.log('5. Monitor browser console for detailed flow logs');

console.log('\n✨ Authentication system test complete!');
