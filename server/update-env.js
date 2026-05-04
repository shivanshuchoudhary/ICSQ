const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

try {
    // Read the current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the CLIENT_URL with localhost
    envContent = envContent.replace(
        /CLIENT_URL="https:\/\/icsq\.sobhaapps\.com"/,
        'CLIENT_URL="http://localhost:5173"'
    );
    
    // Write the updated content back
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Successfully updated CLIENT_URL to localhost!');
    console.log('📝 CLIENT_URL is now set to: http://localhost:5173');
    console.log('🔄 Please restart your server for the changes to take effect.');
    
} catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    console.log('📝 Please manually update your .env file:');
    console.log('   Change: CLIENT_URL="https://icsq.sobhaapps.com"');
    console.log('   To:     CLIENT_URL="http://localhost:5173"');
} 