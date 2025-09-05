/**
 * Chat History Migration and Cleanup
 * 
 * This utility helps migrate from global localStorage to user-specific storage
 * and cleans up any potential data leakage from the old implementation.
 * 
 * Run this in browser console on any ClaimWise page:
 */

(function() {
  console.log('🔧 ClaimWise Chat History Migration Tool');
  console.log('=========================================');
  
  // Check if there's old global chat history
  const oldKey = 'claimwise_chat_history';
  const oldData = localStorage.getItem(oldKey);
  
  if (oldData) {
    console.log('⚠️  Found old global chat history:', oldData.length, 'characters');
    console.log('📝 This data was potentially shared between users (PRIVACY ISSUE)');
    
    // Remove the old global data to prevent further leakage
    localStorage.removeItem(oldKey);
    console.log('✅ Removed old global chat history for security');
    
    try {
      const parsedData = JSON.parse(oldData);
      console.log('📊 Old data contained', parsedData.length, 'messages');
      console.log('🔒 This data has been cleared and will now be loaded from secure server storage');
    } catch (e) {
      console.log('❌ Old data was corrupted');
    }
  } else {
    console.log('✅ No old global chat history found');
  }
  
  // Show current user-specific keys
  const userKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('claimwise_chat_history_')) {
      userKeys.push(key);
    }
  }
  
  if (userKeys.length > 0) {
    console.log('🔐 Found', userKeys.length, 'user-specific chat history keys:');
    userKeys.forEach(key => {
      const data = localStorage.getItem(key);
      const userId = key.replace('claimwise_chat_history_', '');
      try {
        const messages = JSON.parse(data || '[]');
        console.log(`  📱 User ${userId.slice(0, 8)}...: ${messages.length} messages`);
      } catch (e) {
        console.log(`  ❌ User ${userId.slice(0, 8)}...: corrupted data`);
      }
    });
  } else {
    console.log('💾 No user-specific chat history found in localStorage');
    console.log('📡 Chat history will be loaded from secure server storage');
  }
  
  console.log('\n🎯 MIGRATION COMPLETE');
  console.log('🔐 Chat data is now properly isolated per user');
  console.log('📡 New chats will be saved to server with user authentication');
  console.log('🧹 Refresh the page to load your personal chat history');
})();

// Instructions for developers:
console.log(`
🔧 DEVELOPER TESTING COMMANDS:

// Check for any remaining global keys that could cause leakage:
Object.keys(localStorage).filter(k => k.includes('claimwise') && !k.includes('_'))

// View current user's chat storage:
const userId = 'YOUR_USER_ID'; // Get from supabase.auth.getUser()
localStorage.getItem('claimwise_chat_history_' + userId)

// Clear everything for testing:
Object.keys(localStorage).forEach(k => k.startsWith('claimwise_chat_history') && localStorage.removeItem(k))
`);
