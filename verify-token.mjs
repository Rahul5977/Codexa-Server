import jwt from 'jsonwebtoken';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYTE1YzNmMi1hYmRjLTQwZmYtOWViZC0yNzAzZThhNjJkOGUiLCJlbWFpbCI6ImFrc2hhdGdAaWl0YmhpbGFpLmFjLmluIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzI2MTg2MjQsImV4cCI6MTc3MjYxOTUyNCwiaXNzIjoiY29kZXhhLWF1dGgtc2VydmljZSIsInN1YiI6ImJhMTVjM2YyLWFiZGMtNDBmZi05ZWJkLTI3MDNlOGE2MmQ4ZSJ9.OniQRD_fO5vtqbUoQziflA03WwM3H2b9fUuJWzJBiTE";

const secrets = [
  "1234567890access",
  "your-access-secret-key",
  "secret"
];

console.log('\n🔍 Testing token verification with different secrets:\n');

for (const secret of secrets) {
  try {
    const decoded = jwt.verify(token, secret);
    console.log(`✅ SUCCESS with secret: "${secret}"`);
    console.log('Decoded:', JSON.stringify(decoded, null, 2));
    break;
  } catch (error) {
    console.log(`❌ FAILED with secret: "${secret}" - ${error.message}`);
  }
}

// Try without verification to see the payload
console.log('\n📄 Token payload (decoded without verification):');
const decoded = jwt.decode(token);
console.log(JSON.stringify(decoded, null, 2));
