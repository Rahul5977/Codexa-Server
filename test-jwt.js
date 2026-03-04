// Test script to verify JWT token generation and verification
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load auth service .env
console.log('\n=== AUTH SERVICE ===');
dotenv.config({ path: './auth-service/.env' });
const authSecret = process.env.JWT_ACCESS_SECRET;
console.log('JWT_ACCESS_SECRET:', authSecret);

// Generate a test token
const testPayload = {
  userId: 'test-123',
  email: 'test@example.com',
  role: 'STUDENT'
};

const testToken = jwt.sign(testPayload, authSecret, { expiresIn: '15m' });
console.log('\nGenerated Token:', testToken.substring(0, 50) + '...');

// Now verify with classroom service secret
console.log('\n=== CLASSROOM SERVICE ===');
dotenv.config({ path: './classroom-service/.env', override: true });
const classroomSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
console.log('JWT_ACCESS_SECRET:', classroomSecret);

// Try to verify
try {
  const decoded = jwt.verify(testToken, classroomSecret);
  console.log('\n✅ Token verification SUCCESSFUL!');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('\n❌ Token verification FAILED!');
  console.log('Error:', error.message);
}

// Check if secrets match
console.log('\n=== COMPARISON ===');
console.log('Auth Secret:     ', authSecret);
console.log('Classroom Secret:', classroomSecret);
console.log('Secrets Match:   ', authSecret === classroomSecret ? '✅ YES' : '❌ NO');
