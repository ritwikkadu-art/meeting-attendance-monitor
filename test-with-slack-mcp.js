#!/usr/bin/env node

/**
 * Test script using Slack MCP to send real reminders
 * This simulates the meeting reminder for your tomorrow's meeting
 */

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Meeting Reminder Test - Using Slack MCP                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// You can customize this with your actual meeting details
const testMeeting = {
  summary: "Product Strategy Discussion",  // Your meeting name
  startTime: "2026-03-23T09:00:00+05:30", // Tomorrow 9 AM IST
  organizerName: "Product Team",
  meetingLink: "https://meet.google.com/your-meeting-link",
  yourEmail: "ritwik.kadu@razorpay.com"
};

async function runTest() {
  console.log('📋 Test Configuration:');
  console.log(`   Meeting: ${testMeeting.summary}`);
  console.log(`   Time: ${new Date(testMeeting.startTime).toLocaleString()}`);
  console.log(`   Your email: ${testMeeting.yourEmail}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Pre-meeting reminder
  console.log('📅 TEST 1: Pre-Meeting Reminder (2 hours before)\n');

  const preMeetingMessage = `📅 Reminder: You have a meeting coming up in 2 hours!

*"${testMeeting.summary}"*
⏰ Starts at: ${new Date(testMeeting.startTime).toLocaleTimeString('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata'
})}
📍 Organized by: ${testMeeting.organizerName}

You haven't accepted this invite yet. Please let ${testMeeting.organizerName} know if you can make it.

Meeting link:
${testMeeting.meetingLink}`;

  console.log('   Message that would be sent:');
  console.log('   ┌────────────────────────────────────────────────────────');
  preMeetingMessage.split('\n').forEach(line => {
    console.log(`   │ ${line}`);
  });
  console.log('   └────────────────────────────────────────────────────────\n');

  // Test 2: Post-meeting reminder
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('👋 TEST 2: Post-Meeting Reminder (2 minutes after start)\n');

  const postMeetingMessage = `👋 Hi! The meeting "${testMeeting.summary}" started 2 minutes ago.

It looks like you haven't joined yet. Here's the link if you need it:
${testMeeting.meetingLink}

Meeting organized by ${testMeeting.organizerName}`;

  console.log('   Message that would be sent:');
  console.log('   ┌────────────────────────────────────────────────────────');
  postMeetingMessage.split('\n').forEach(line => {
    console.log(`   │ ${line}`);
  });
  console.log('   └────────────────────────────────────────────────────────\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Test messages prepared!\n');
  console.log('📝 To send a REAL test message to yourself via Slack:');
  console.log('   I can use Slack MCP to send you one of these messages right now.\n');
  console.log('   Just confirm and I\'ll send it to your Slack!\n');
}

runTest().catch(console.error);
