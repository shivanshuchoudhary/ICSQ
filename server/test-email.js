#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * This script tests the email configuration to help debug SSL/TLS issues.
 * Run with: node test-email.js
 */

import { testEmailConfiguration } from './src/utils/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 Testing Email Configuration...\n');

// Display current configuration (without sensitive data)
console.log('Current SMTP Configuration:');
console.log(`Host: ${process.env.SMTP_HOST || 'Not set'}`);
console.log(`Port: ${process.env.SMTP_PORT || 'Not set'}`);
console.log(`Secure: ${process.env.SMTP_SECURE || 'Not set'}`);
console.log(`Email: ${process.env.SMTP_MAIL || 'Not set'}`);
console.log(`From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Not set'}`);
console.log(`Client URL: ${process.env.CLIENT_URL || 'Not set'}\n`);

// Test the configuration
testEmailConfiguration()
  .then(result => {
    if (result.success) {
      console.log('✅ Email configuration test PASSED!');
      console.log(`Message ID: ${result.messageId}`);
    } else {
      console.log('❌ Email configuration test FAILED!');
      console.log(`Error: ${result.error}`);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error during email test:', error);
  });
