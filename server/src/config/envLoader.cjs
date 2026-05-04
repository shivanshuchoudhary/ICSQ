const dotenv = require('dotenv');
const path = require('path');

// Construct the absolute path to the .env file, which is two levels up from /src/config
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

console.log(`[EnvLoader CJS] Attempting to load .env from: ${envPath}`);
console.log(`[EnvLoader CJS] MICROSOFT_CLIENT_ID loaded: ${process.env.MICROSOFT_CLIENT_ID ? 'YES' : 'NO'}`); 