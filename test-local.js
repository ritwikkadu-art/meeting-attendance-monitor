#!/usr/bin/env node

/**
 * Local testing script for the meeting attendance monitor
 * Loads environment variables from .env file and runs the function
 */

require('dotenv').config();

const { checkMeetingAttendance } = require('./index.js');

// Mock request and response objects
const mockReq = {
  method: 'POST',
  headers: {},
  body: {}
};

const mockRes = {
  statusCode: null,
  responseData: null,

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(data) {
    this.responseData = data;
    console.log('\n=== Response ===');
    console.log(`Status: ${this.statusCode}`);
    console.log('Data:', JSON.stringify(data, null, 2));
    return this;
  }
};

console.log('=== Testing Meeting Attendance Monitor Locally ===\n');
console.log('Configuration:');
console.log(`- Calendar User: ${process.env.GOOGLE_CALENDAR_USER_EMAIL || 'NOT SET'}`);
console.log(`- Service Account: ${process.env.SERVICE_ACCOUNT_EMAIL || 'NOT SET'}`);
console.log(`- Slack Token: ${process.env.SLACK_BOT_TOKEN ? 'SET' : 'NOT SET'}`);
console.log(`- Credentials File: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`);
console.log('');

// Validate environment
const required = [
  'GOOGLE_CALENDAR_USER_EMAIL',
  'SLACK_BOT_TOKEN',
  'SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_APPLICATION_CREDENTIALS'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease create a .env file from .env.example and fill in the values.');
  process.exit(1);
}

console.log('✅ All required environment variables are set\n');
console.log('Running function...\n');

// Run the function
checkMeetingAttendance(mockReq, mockRes)
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
